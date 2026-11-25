const { query } = require("../config/db");
const { emitToUser } = require("../realtime");

/**
 * Создаёт уведомление, отправляет по сокету и чистит старые (лимит 50).
 */
const createNotification = async ({
  userId,
  actorId = null,
  boardId = null,
  taskId = null,
  kind,
  title,
  body = null,
  link = null,
  metadata = null,
}) => {
  try {
    // 1. Вставляем уведомление в БД
    const { rows } = await query(
      `INSERT INTO notifications 
        (user_id, actor_id, board_id, task_id, kind, title, body, link, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, actorId, boardId, taskId, kind, title, body, link, metadata ? JSON.stringify(metadata) : null]
    );
    
    const notification = rows[0];

    // 2. Отправляем в реальном времени
    emitToUser(userId, "notification:new", notification);

    // 3. Лимит: удаляем старые, оставляем только 50 последних
    await query(
      `DELETE FROM notifications 
       WHERE user_id = $1 AND id NOT IN (
         SELECT id FROM notifications 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 50
       )`,
      [userId]
    );

    return notification;
  } catch (err) {
    // Уведомления не должны ломать основной бизнес-процесс (например, создание задачи)
    console.error("Ошибка при создании уведомления:", err);
  }
};

module.exports = { createNotification };