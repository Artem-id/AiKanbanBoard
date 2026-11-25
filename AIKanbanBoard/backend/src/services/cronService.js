const cron = require("node-cron");
const { query } = require("../config/db");
const { createNotification } = require("./notificationService");

const initCronJobs = () => {
  // Запускаем каждую минуту (для теста) или каждый час (в продакшене)
  // Формат: '0 * * * *' — каждый час в 0 минут
  cron.schedule("0 * * * *", async () => {
    console.log("⏰ Проверка дедлайнов задач...");
    try {
      // Находим задачи, до дедлайна которых осталось менее 24 часов,
      // у которых есть исполнитель, и задача еще не выполнена (например, колонка != "Готово")
      const { rows: tasks } = await query(
        `SELECT t.id, t.title, t.assignee_id, t.board_id, b.title AS board_title
         FROM tasks t
         JOIN boards b ON b.id = t.board_id
         JOIN columns c ON c.id = t.column_id
         WHERE t.due_date IS NOT NULL
           AND t.due_date > now()
           AND t.due_date <= now() + interval '24 hours'
           AND t.assignee_id IS NOT NULL
           AND c.title != 'Готово'`
      );

      for (const task of tasks) {
        // Пытаемся создать уведомление.
        // Благодаря уникальному индексу uq_notifications_deadline_day,
        // если уведомление уже было создано сегодня, база проигнорирует вставку.
        
        // Но чтобы не спамить createNotification в консоль, 
        // мы сначала проверим, есть ли уже уведомление за сегодня.
        const checkRes = await query(
          `SELECT id FROM notifications 
           WHERE user_id = $1 AND task_id = $2 AND kind = 'deadline' 
             AND (created_at AT TIME ZONE 'UTC')::date = (now() AT TIME ZONE 'UTC')::date`,
          [task.assignee_id, task.id]
        );

        if (checkRes.rows.length === 0) {
          await createNotification({
            userId: task.assignee_id,
            boardId: task.board_id,
            taskId: task.id,
            kind: "deadline",
            title: "Приближается дедлайн",
            body: `Срок задачи «${task.title}» на доске «${task.board_title}» истекает менее чем через 24 часа.`,
            link: `/board/${task.board_id}?task=${task.id}`,
          });
          console.log(`✅ Создано уведомление о дедлайне для задачи ${task.title}`);
        }
      }
    } catch (err) {
      console.error("❌ Ошибка в cron-задаче дедлайнов:", err);
    }
  });
};

module.exports = { initCronJobs };