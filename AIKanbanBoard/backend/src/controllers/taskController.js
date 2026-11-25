const { query } = require("../config/db");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { emitToBoard, logActivity } = require("../realtime");
const { createNotification } = require("../services/notificationService"); // <-- ДОБАВЛЕНО

const PRIORITIES = ["low", "medium", "high", "urgent"];

const fetchTask = async (taskId) => {
  const { rows } = await query(
    `SELECT t.*,
      a.name AS assignee_name, a.email AS assignee_email, a.avatar_url AS assignee_avatar,
      c.title AS column_title
    FROM tasks t
    LEFT JOIN users a ON a.id = t.assignee_id
    LEFT JOIN columns c ON c.id = t.column_id
    WHERE t.id = $1`,
    [taskId]
  );
  return rows[0];
}

const ensureColumnInBoard = async (columnId, boardId) => {
  const { rows } = await query(
    "SELECT id FROM columns WHERE id = $1 AND board_id = $2",
    [columnId, boardId]
  );
  if (!rows.length) throw ApiError.badRequest("Колонка не принадлежит этой доске");
};

const listTasks = asyncHandler(async (req, res) => {
  const filters = ["t.board_id = $1"];
  const params = [req.board.id];

  if (req.query.priority) {
    params.push(req.query.priority);
    filters.push(`t.priority = $${params.length}`);
  }
  if (req.query.assignee) {
    params.push(req.query.assignee) ;
    filters.push(`t.assignee_id = $${params.length}`);
  }
  if (req.query.column) {
    params.push(req.query.column) ;
    filters.push(`t.column_id = $${params.length}`);
  }
  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    filters.push(`(t.title ILIKE $${params.length} OR t.description ILIKE $${params.length})`);
  }

  const { rows } = await query(
    `SELECT t.*,
        a.name AS assignee_name, a.email AS assignee_email, a.avatar_url AS assignee_avatar,
        c.title AS column_title -- <-- ВОТ ЭТО НУЖНО
       FROM tasks t
       LEFT JOIN users a ON a.id = t.assignee_id
       LEFT JOIN columns c ON c.id = t.column_id -- <-- И ЭТО
     WHERE ${filters.join(" AND ")}
     ORDER BY t.position ASC`,
    params
  );
  res.json({ tasks: rows});
});

const createTask = asyncHandler(async (req, res) => {
  const { column_id, title: rawTitle, description, due_date, assignee_id } = req.body;
  const title = (rawTitle || "").trim();
  const priority = PRIORITIES.includes(req.body.priority) ? req.body.priority : "medium";

  if (!title) throw ApiError.badRequest("Название задачи обязательно");
  if (!column_id) throw ApiError.badRequest("Не указана колонка (column_id)");
  await ensureColumnInBoard(column_id, req.board.id);

  const posRes = await query(
    "SELECT COALESCE(MAX(position), 0) + 1000 AS pos FROM tasks WHERE column_id = $1",
    [column_id]
  );

  const { rows } = await query(
    `INSERT INTO tasks (board_id, column_id, title, description, priority, due_date, assignee_id, position, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id`,
    [
      req.board.id,
      column_id,
      title,
      description || null,
      priority,
      due_date || null,
      assignee_id || null,
      posRes.rows[0].pos,
      req.user.id,
    ]
  );

  const task = await fetchTask(rows[0].id);
  emitToBoard(req.board.id, "task:created", task);
  await logActivity({
    boardId: req.board.id,
    userId: req.user.id,
    action: "task.created",
    message: `${req.user.name} создал(а) задачу "${task.title}"`,
    metadata: { taskId: task.id },
  });

  // УВЕДОМЛЕНИЕ: Назначение на задачу (если назначили не себя)
  if (assignee_id && assignee_id !== req.user.id) {
    const boardRes = await query("SELECT title FROM boards WHERE id = $1", [req.board.id]);
    await createNotification({
      userId: assignee_id,
      actorId: req.user.id,
      boardId: req.board.id,
      taskId: task.id,
      kind: "assigned",
      title: "Новая задача",
      body: `Вас назначили на задачу «${task.title}» на доске «${boardRes.rows[0].title}»`,
      link: `/board/${req.board.id}?task=${task.id}`,
    });
  }

  res.status(201).json({ task });
});

const updateTask = asyncHandler(async (req, res) => {
  const { title, description, priority, due_date, assignee_id } = req.body;
  if (priority !== undefined && !PRIORITIES.includes(priority))
    throw ApiError.badRequest("Неверный приоритет");

  // Узнаём старого исполнителя до обновления
  const oldTaskRes = await query("SELECT assignee_id, title FROM tasks WHERE id = $1 AND board_id = $2", [req.params.taskId, req.board.id]);
  if (!oldTaskRes.rows.length) throw ApiError.notFound("Задача не найдена");
  const oldAssigneeId = oldTaskRes.rows[0].assignee_id;

  const { rows } = await query(
    `UPDATE tasks
      SET title     = COALESCE($3, title),
        description = COALESCE($4, description),
        priority    = COALESCE($5, priority),
        due_date    = COALESCE($6, due_date),
        assignee_id = $7,
      updated_at = now()
     WHERE id = $1 AND board_id = $2
     RETURNING id`,
    [
      req.params.taskId,
      req.board.id,
      title ?? null,
      description ?? null,
      priority ?? null,
      due_date ?? null,
      assignee_id === undefined ? null : assignee_id,
    ]
  );
  if (!rows.length) throw ApiError.notFound("Задача не найдена");

  const task = await fetchTask(rows[0].id);
  emitToBoard(req.board.id, "task:updated", task);

  // УВЕДОМЛЕНИЕ: Смена исполнителя
  if (assignee_id && assignee_id !== req.user.id && assignee_id !== oldAssigneeId) {
    const boardRes = await query("SELECT title FROM boards WHERE id = $1", [req.board.id]);
    await createNotification({
      userId: assignee_id,
      actorId: req.user.id,
      boardId: req.board.id,
      taskId: task.id,
      kind: "assigned",
      title: "Назначение на задачу",
      body: `Вас назначили на задачу «${task.title}» на доске «${boardRes.rows[0].title}»`,
      link: `/board/${req.board.id}?task=${task.id}`,
    });
  }

  res.json({ task });
});

const moveTask = asyncHandler(async (req, res) => {
  const { column_id, position } = req.body;
  if (!column_id || position === undefined)
    throw ApiError.badRequest("Не указаны колонка и позиция");
  await ensureColumnInBoard(column_id, req.board.id);

  const prevRes = await query(
    "SELECT t.column_id, c.title FROM tasks t JOIN columns c ON c.id = t.column_id WHERE t.id = $1 AND t.board_id = $2",
    [req.params.taskId, req.board.id]
  );
  if (!prevRes.rows.length) throw ApiError.notFound("Задача не найдена");
  
  const prevColumnId = prevRes.rows[0].column_id;
  const movedColumns = prevColumnId !== column_id;

  // Получаем название новой колонки
  const newColRes = await query("SELECT title FROM columns WHERE id = $1", [column_id]);

  const { rows } = await query(
    `UPDATE tasks
      SET column_id = $3, position = $4, updated_at = now()
     WHERE id = $1 AND board_id = $2
     RETURNING id`,
    [req.params.taskId, req.board.id, column_id, position]
  );

  const task = await fetchTask(rows[0].id);
  emitToBoard(req.board.id, "task:moved", task);

  if (movedColumns) {
    await logActivity({
      boardId: req.board.id,
      userId: req.user.id,
      action: "task.moved",
      message: `${req.user.name} переместил(а) "${task.title}" в колонку ${newColRes.rows[0].title}`,
      metadata: { taskId: task.id, columnId: column_id },
    });
  }
  res.json({ task });
});

const deleteTask = asyncHandler(async (req, res) => {
  // Узнаём исполнителя до удаления задачи
  const taskInfoRes = await query("SELECT title, assignee_id FROM tasks WHERE id = $1 AND board_id = $2", [req.params.taskId, req.board.id]);
  if (!taskInfoRes.rows.length) throw ApiError.notFound("Задача не найдена");
  const { title, assignee_id } = taskInfoRes.rows[0];

  const { rows } = await query(
    "DELETE FROM tasks WHERE id = $1 AND board_id = $2 RETURNING title",
    [req.params.taskId, req.board.id],
  );
  if (!rows.length) throw ApiError.notFound("Задача не найдена");

  emitToBoard(req.board.id, "task:deleted", { id: req.params.taskId });
  await logActivity({
    boardId: req.board.id,
    userId: req.user.id,
    action: "task.deleted",
    message: `${req.user.name} удалил(а) задачу "${rows[0].title}"`,
    metadata: { taskId: req.params.taskId },
  });

  // УВЕДОМЛЕНИЕ: Задачу удалили
  if (assignee_id && assignee_id !== req.user.id) {
    const boardRes = await query("SELECT title FROM boards WHERE id = $1", [req.board.id]);
    await createNotification({
      userId: assignee_id,
      actorId: req.user.id,
      boardId: req.board.id,
      kind: "removed_task",
      title: "Задача удалена",
      body: `${req.user.name} удалил(а) задачу «${title}», на которую вы были назначены (доска «${boardRes.rows[0].title}»).`,
      link: `/board/${req.board.id}`, // Доска, чтобы можно было перейти
    });
  }

  res.json({ success: true });
});

module.exports = { listTasks, createTask, updateTask, moveTask, deleteTask };