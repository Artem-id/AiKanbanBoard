const { query } = require("../config/db");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// Получить уведомления (сгруппированные по времени делаем на фронте, здесь просто отдаём список)
const getNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 50);
  
  const { rows } = await query(
    `SELECT n.*, 
            u.name AS actor_name, 
            u.avatar_url AS actor_avatar
     FROM notifications n
     LEFT JOIN users u ON u.id = n.actor_id
     WHERE n.user_id = $1
     ORDER BY n.created_at DESC
     LIMIT $2`,
    [req.user.id, limit]
  );

  // Считаем количество непрочитанных
  const countRes = await query(
    "SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id = $1 AND read_at IS NULL",
    [req.user.id]
  );

  res.json({ 
    notifications: rows,
    unreadCount: countRes.rows[0].unread
  });
});

// Отметить одно уведомление прочитанным
const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const { rows } = await query(
    "UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 RETURNING *",
    [id, req.user.id]
  );
  
  if (!rows.length) throw ApiError.notFound("Уведомление не найдено");
  res.json({ notification: rows[0] });
});

// Отметить ВСЕ прочитанными
const markAllAsRead = asyncHandler(async (req, res) => {
  await query(
    "UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL",
    [req.user.id]
  );
  res.json({ success: true });
});

// Удалить уведомление (опционально)
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await query(
    "DELETE FROM notifications WHERE id = $1 AND user_id = $2",
    [id, req.user.id]
  );
  if (!result.rowCount) throw ApiError.notFound("Уведомление не найдено");
  res.json({ success: true });
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};