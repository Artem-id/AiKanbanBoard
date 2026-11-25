const { query, withTransaction } = require("../config/db");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { emitToBoard, emitToUser, logActivity } = require("../realtime");
const { createNotification } = require("../services/notificationService");

const DEFAULT_COLUMNS = ["Сделать", "В работе", "На проверке", "Готово"];

const listBoards = asyncHandler(async (req, res) => {
  const { rows }= await query(
    `SELECT b .* ,
            (b.owner_id = $1)              AS is_owner,
            mm.role                        AS my_role,
            (SELECT COUNT(*) FROM tasks t WHERE t.board_id = b.id) AS task_count,
            (SELECT COUNT(*) FROM board_members m WHERE m.board_id = b.id) AS member_count
        FROM boards b
        LEFT JOIN board_members mm ON mm.board_id = b.id AND mm.user_id = $1
      WHERE b.owner_id = $1 OR mm.user_id = $1
      ORDER BY b.updated_at DESC`,
    [req.user.id]
  );
  res.json({ boards: rows });
});

const createBoard = asyncHandler(async (req, res) => {
  const title = (req.body.title || "").trim();
  const description = (req.body.description || "").trim() || null;
  const color = req.body.color || "#6366f1";
  if (!title) throw ApiError.badRequest("Название доски обязательно");

const board = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO boards (title, description, color, owner_id)
      VALUES ($1, $2, $3, $4) RETURNING *`,
    [title, description, color, req.user.id]
    );
    const b = rows[0] ;

    await client.query(
      `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [b.id, req.user.id]
    );

    for (let i=0; i < DEFAULT_COLUMNS.length; i++) {
    await client.query(
      `INSERT INTO columns (board_id, title, position) VALUES ($1, $2, $3)`,
      [b.id, DEFAULT_COLUMNS[i], (i +1) * 1000]
    );
    }
    return b;
  });

  res.status(201).json({board });
});

const getBoard = asyncHandler(async (req, res) => {
  const boardId = req.board.id;

  const [boardRes, columnsRes, tasksRes, membersRes] = await Promise.all([
    query("SELECT * FROM boards WHERE id = $1", [boardId]),
    query("SELECT * FROM columns WHERE board_id = $1 ORDER BY position ASC", [boardId]),
    query(
      `SELECT t .* ,
          a.name AS assignee_name, a.email AS assignee_email, a.avatar_url AS assignee_avatar
       FROM tasks t
       LEFT JOIN users a ON a.id = t.assignee_id
      WHERE t.board_id = $1
      ORDER BY t.position ASC`,
    [boardId]
    ),
      query(
        `SELECT u.id, u.name, u.email, u.avatar_url, m.role, m.joined_at
          FROM board_members m
          JOIN users u ON u.id = m.user_id
        WHERE m.board_id = $1
        ORDER BY m.joined_at ASC`,
      [boardId]
    ),
  ]);

  res. json ({
    board: boardRes.rows[0],
    columns: columnsRes.rows,
    tasks: tasksRes.rows,
    members: membersRes.rows,
    role: req.board.role,
  });
});

const updateBoard = asyncHandler(async (req, res) => {
  if (req.board.role !== "owner" && req.board.role !== "admin")
    throw ApiError.forbidden("Только владелец или админ может переименовать доску");

  const { title, description, color } = req.body;

  // 1. Получаем старое название доски ДО обновления
  const oldBoardRes = await query("SELECT title FROM boards WHERE id = $1", [req.board.id]);
  const oldTitle = oldBoardRes.rows[0]?.title;

  // 2. Обновляем доску
  const { rows } = await query(
    `UPDATE boards
        SET title = COALESCE($2, title),
            description = COALESCE($3, description),
            color = COALESCE($4, color),
            updated_at = now()
       WHERE id = $1
       RETURNING *`,
    [req.board.id, title ?? null, description ?? null, color ?? null]
  );
  
  const updatedBoard = rows[0];

  // 3. Логируем активность
  await logActivity({
    boardId: req.board.id,
    userId: req.user.id,
    action: "board.updated",
    message: `${req.user.name} переименовал(а) доску «${oldTitle}» в «${updatedBoard.title}»`,
    metadata: { title: updatedBoard.title, oldTitle },
  });

  // 4. Отправляем сокет
  emitToBoard(req.board.id, "board:updated", updatedBoard);

  // 5. Отправляем уведомления остальным участникам
  const membersRes = await query(
    "SELECT user_id FROM board_members WHERE board_id = $1 AND user_id != $2",
    [req.board.id, req.user.id]
  );

  for (const member of membersRes.rows) {
    await createNotification({
      userId: member.user_id,
      actorId: req.user.id,
      boardId: req.board.id,
      kind: "board_updated",
      title: "Доска обновлена",
      body: `${req.user.name} переименовал(а) доску «${oldTitle}» в «${updatedBoard.title}»`,
      link: `/board/${req.board.id}`,
    });
    emitToUser(member.user_id, "board:updated", updatedBoard);
  }

  res.json({ board: updatedBoard });
});

const deleteBoard = asyncHandler(async (req, res) => {
  if (req.board.role !== "owner")
    throw ApiError.forbidden("Только владелец может удалить эту доску");

  // 1. Получаем название доски ДО удаления
  const boardRes = await query("SELECT title FROM boards WHERE id = $1", [req.board.id]);
  const boardTitle = boardRes.rows[0]?.title || "Без названия";

  // 2. Получаем участников
  const membersRes = await query(
    "SELECT user_id FROM board_members WHERE board_id = $1 AND user_id != $2",
    [req.board.id, req.user.id]
  );

  // 3. Удаляем
  await query("DELETE FROM boards WHERE id = $1", [req.board.id]);

  // 4. Сокет
  emitToBoard(req.board.id, "board:deleted", { id: req.board.id });
  
  // 5. Уведомления
  for (const member of membersRes.rows) {
    await createNotification({
      userId: member.user_id,
      actorId: req.user.id,
      boardId: null,
      kind: "board_deleted",
      title: "Доска удалена",
      body: `${req.user.name} удалил(а) доску «${boardTitle}»`,
      link: null,
    });
  }

  res.json({ success: true });
});

const getActivity = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const { rows } = await query(
    `SELECT act .* , u.name AS user_name, u.avatar_url AS user_avatar
      FROM activities act
      LEFT JOIN users u ON u.id = act.user_id
     WHERE act.board_id = $1
     ORDER BY act.created_at DESC
     LIMIT $2`,
    [req.board.id, limit]
  );
  res.json({ activities: rows });
});

const addMember = asyncHandler(async (req, res) => {
  if (req.board.role !== "owner" && req.board.role !== "admin")
    throw ApiError.forbidden("Только владельцы или администраторы могут добавлять участников");

  const email = (req.body.email || "").trim().toLowerCase();
  if (!email) throw ApiError.badRequest("Email участника обязателен");

  const userRes = await query(
    "SELECT id, name, email, avatar_url FROM users WHERE email = $1",
    [email]
  );
  const user = userRes.rows[0];
  if (!user) throw ApiError.notFound("Пользователь с таким email не найден");

  const existing = await query(
    "SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2",
    [req.board.id, user.id]
  );
  if (existing.rows.length) {
    throw ApiError.conflict("Пользователь с таким email уже есть на доске");
  }

  const role = "member";

  await query(
    `INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)`,
    [req.board.id, user.id, role]
  );

  await logActivity({
    boardId: req.board.id,
    userId: req.user.id,
    action: "member.added",
    message: `${req.user.name} добавил(а) ${user.name} на доску`,
    metadata: { memberId: user.id, role },
  });

  // УВЕДОМЛЕНИЕ: Вас добавили на доску
  const boardRes = await query("SELECT title FROM boards WHERE id = $1", [req.board.id]);
  await createNotification({
    userId: user.id,
    actorId: req.user.id,
    boardId: req.board.id,
    kind: "invite",
    title: "Приглашение на доску",
    body: `${req.user.name} добавил(а) вас на доску «${boardRes.rows[0].title}»`,
    link: `/board/${req.board.id}`,
    metadata: { role }
  });

  // Отправляем в комнату доски (для тех, кто уже на ней)
  emitToBoard(req.board.id, "member:added", { ...user, role });
  
  // Отправляем лично новому участнику, чтобы у него обновился дашборд
  emitToUser(user.id, "board:invited", { boardId: req.board.id });

  res.status(201).json({ member: { ...user, role } });
});

const MAX_ADMINS = 2;

const updateMemberRole = asyncHandler(async (req, res) => {
  if (req.board.role !== "owner" && req.board.role !== "admin")
    throw ApiError.forbidden("Только владельцы или администраторы могут менять роли");

  const { userId } = req.params;
  const { role } = req.body;

  if (!["admin", "member"].includes(role))
    throw ApiError.badRequest("Роль должна быть admin или member");

  if (String(userId) === String(req.board.owner_id))
    throw ApiError.badRequest("Нельзя изменить роль владельца доски");

  const targetRes = await query(
    "SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2",
    [req.board.id, userId]
  );
  if (!targetRes.rows.length) throw ApiError.notFound("Участник не найден");
  const targetRole = targetRes.rows[0].role;

  if (req.board.role === "admin" && targetRole === "admin")
    throw ApiError.forbidden("Администратор не может изменить роль другому администратору");

  if (role === "admin" && targetRole !== "admin") {
    const countRes = await query(
      "SELECT COUNT(*)::int AS cnt FROM board_members WHERE board_id = $1 AND role = 'admin'",
      [req.board.id]
    );
    if (countRes.rows[0].cnt >= MAX_ADMINS)
      throw ApiError.badRequest(
        `На доске уже максимум администраторов (${MAX_ADMINS}). Сначала снимите роль с другого администратора.`
      );
  }

  if (targetRole === role) {
    const userRes = await query(
      "SELECT id, name, email, avatar_url FROM users WHERE id = $1",
      [userId]
    );
    return res.json({ member: { ...userRes.rows[0], role } });
  }

  const { rows } = await query(
    `UPDATE board_members SET role = $3
      WHERE board_id = $1 AND user_id = $2
      RETURNING user_id, role`,
    [req.board.id, userId, role]
  );
  if (!rows.length) throw ApiError.notFound("Участник не найден");

  const userRes = await query(
    "SELECT id, name, email, avatar_url FROM users WHERE id = $1",
    [userId]
  );
  const user = userRes.rows[0];

  await logActivity({
    boardId: req.board.id,
    userId: req.user.id,
    action: "member.role_changed",
    message: `${req.user.name} изменил(а) роль ${user.name} на ${
      role === "admin" ? "администратор" : "участник"
    }`,
    metadata: { memberId: user.id, newRole: role },
  });

  // УВЕДОМЛЕНИЕ: Смена роли
  const boardRes = await query("SELECT title FROM boards WHERE id = $1", [req.board.id]);
  await createNotification({
    userId: user.id,
    actorId: req.user.id,
    boardId: req.board.id,
    kind: "role_changed",
    title: "Изменение роли",
    body: `Ваша роль на доске «${boardRes.rows[0].title}» изменена на ${
      role === "admin" ? "Администратор" : "Участник"
    }`,
    link: `/board/${req.board.id}`,
    metadata: { newRole: role }
  });

  emitToBoard(req.board.id, "member:updated", { ...user, role });
  res.json({ member: { ...user, role } });
});

const removeMember = asyncHandler(async (req, res) => {
  if (req.board.role !== "owner" && req.board.role !== "admin")
    throw ApiError.forbidden("Только владельцы или администраторы могут удалять участников");

  const { userId } = req.params;
  if (String(userId) === String(req.board.owner_id))
    throw ApiError.badRequest("Нельзя удалить владельца доски");

  if (req.board.role === "admin") {
    const target = await query(
      "SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2",
      [req.board.id, userId]
    );
    if (!target.rows.length) throw ApiError.notFound("Участник не найден");
    if (target.rows[0].role === "admin")
      throw ApiError.forbidden("Администратор не может удалить другого администратора");
  }

  const userRes = await query(
    "SELECT id, name, email, avatar_url FROM users WHERE id = $1",
    [userId]
  );
  const user = userRes.rows[0];

  const result = await query(
    "DELETE FROM board_members WHERE board_id = $1 AND user_id = $2",
    [req.board.id, userId]
  );
  if (!result.rowCount) throw ApiError.notFound("Участник не найден");

  await logActivity({
    boardId: req.board.id,
    userId: req.user.id,
    action: "member.removed",
    message: `${req.user.name} удалил(а) ${user?.name || "участника"} с доски`,
    metadata: { memberId: userId },
  });

  // УВЕДОМЛЕНИЕ: Вас удалили с доски
  if (user) {
    const boardRes = await query("SELECT title FROM boards WHERE id = $1", [req.board.id]);
    await createNotification({
      userId: user.id,
      actorId: req.user.id,
      boardId: req.board.id,
      kind: "removed_board",
      title: "Удаление с доски",
      body: `${req.user.name} удалил(а) вас с доски «${boardRes.rows[0].title}»`,
      link: null, // Доска больше не доступна
      metadata: {}
    });
  }

  emitToBoard(req.board.id, "member:removed", { id: userId });
  res.json({ success: true });
});

module.exports = {
  listBoards,
  createBoard,
  getBoard,
  updateBoard,
  deleteBoard,
  getActivity,
  addMember,
  updateMemberRole,
  removeMember,
};