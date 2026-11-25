require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool, withTransaction } = require("../config/db");

const PASSWORD = "Test@1234";
const DAY = 86400000;
const COLUMNS = ["Сделать", "В работе", "На проверке", "Готово"];
// Дефолтные цвета для колонок (как в нашем компоненте columnAccent)
const COL_COLORS = ["#f43f5e", "#f59e0b", "#0ea5e9", "#10b981"]; 

const USERS = [
  { key: "Алексей", name: "Алексей Ривера", email: "alex@novreg.ru" },
  { key: "Майя", name: "Майя Чен", email: "maya@gmail.com" },
  { key: "Дмитрий", name: "Дмитрий Сантос", email: "dmitriy@mail.com" },
  { key: "Прия", name: "Прия Ноир", email: "priya@gmail.com" },
  { key: "Сэм", name: "Сэм Окафор", email: "sam@gmail.com" },
  { key: "Елена", name: "Елена Фишер", email: "lena@novreg.ru" },
];

const BOARDS = [
  {
    title: "Планирование продукта",
    description: "Квартальное планирование, OKR и приоритизация фич.",
    color: "#2f8159",
    owner: "Алексей",
    members: ["Майя", "Дмитрий", "Прия"],
    updatedDaysAgo: 0.3,
    tasks: [
      "Определить OKR на Q3", "Приоритизировать бэклог фич", "Синтез пользовательских интервью",
      "План эксперимента с ценами", "Анализ конкурентов", "Ревью роадмапа с руководством",
      "Определить метрики успеха", "Разбор отзывов бета-версии", "Презентация квартального плана",
      "Согласование со стейкхолдерами", "План раскатки фича-флагов", "Обновить публичный роадмап",
    ],
  },
  {
    title: "Запуск мобильного приложения",
    description: "Выпуск приложений для iOS и Android в сторы.",
    color: "#c26a45",
    owner: "Алексей",
    members: ["Сэм", "Елена"],
    updatedDaysAgo: 1.2,
    tasks: [
      "Текст для страницы в App Store", "Настройка push-уведомлений", "Интеграция отчетов о крашах",
      "Экраны онбординга", "Бета-тест в TestFlight", "Профилирование производительности",
      "Диплинки", "Чек-лист релиза", "Маркетинговые скриншоты", "Доработка иконки приложения",
    ],
  },
  {
    title: "Редизайн сайта",
    description: "Обновление маркетингового сайта в новом дизайне.",
    color: "#5f7da6",
    owner: "Алексей",
    members: ["Елена", "Дмитрий"],
    updatedDaysAgo: 2.6,
    tasks: [
      "Вайрфрейм главной страницы", "Дизайн hero-секции", "Адаптивная навигация",
      "Перенос блога", "SEO-аудит", "Проверка доступности", "Оптимизация Lighthouse",
    ],
  },
  {
    title: "Маркетинг Q3",
    description: "Кампании, контент и эксперименты по росту.",
    color: "#d4a23c",
    owner: "Алексей",
    members: ["Дмитрий", "Прия"],
    updatedDaysAgo: 4,
    tasks: [
      "Запуск email-рассылки", "Контент-план для соцсетей", "Планирование вебинара",
      "Написание кейса", "Обновление рекламных креативов",
    ],
  },
  {
    title: "Дизайн-система",
    description: "Токены, компоненты и документация.",
    color: "#2c9c8f",
    owner: "Алексей",
    members: ["Елена", "Майя"],
    updatedDaysAgo: 0.8,
    tasks: [
      "Аудит именования токенов", "Компонент кнопки", "Базовые элементы форм",
      "Токены темы", "Чистка иконок", "Сайт с документацией", "Гайдлайны по анимации", "Проверка контраста",
    ],
  },
  {
    title: "Онбординг клиентов",
    description: "Сделать первый опыт использования приятным.",
    color: "#a05d7d",
    owner: "Алексей",
    members: ["Прия"],
    updatedDaysAgo: 6,
    tasks: [
      "Приветственная цепочка писем", "Тур по приложению", "Статьи в справочном центре", "Чек-лист онбординга",
    ],
  },
  {
    title: "Инженерный спринт",
    description: "Текущий двухнедельный спринт.",
    color: "#6f9b54",
    owner: "Майя",
    members: ["Алексей", "Сэм", "Дмитрий"],
    updatedDaysAgo: 1.8,
    tasks: [
      "Рефакторинг модуля авторизации", "Починить переподключение websocket", "Добавить rate limiting",
      "Тюнинг индексов БД", "Пагинация API", "Написать интеграционные тесты",
      "Обновление до Node 22", "Кэш-слой для досок", "Настроить алерты Sentry", "Разобрать бэклог ревью",
    ],
  },
  {
    title: "Контент-календарь",
    description: "Редакционный план для блога и рассылки.",
    color: "#4f9d82",
    owner: "Дмитрий",
    members: ["Алексей", "Прия"],
    updatedDaysAgo: 9,
    tasks: ["Блог: ИИ в управлении продуктами", "Рассылка #14", "История клиента: Acme"],
  },
];

const COL_CYCLE = [0, 1, 1, 2, 3, 0, 2, 3, 1, 3, 0, 1];
const PRIO_CYCLE = ["medium", "high", "low", "urgent", "medium", "high", "low", "urgent"];
const DUE_CYCLE = [-9, 2, null, 5, -2, 14, 1, null, 20, -4, 6, 9, 3, null, 12, -1, 7];

const run = async () => {
  await withTransaction(async (c) => {
    // 1. Очистка уведомлений (чтобы не было ошибок при удалении пользователей)
    await c.query("TRUNCATE notifications CASCADE");

    // 2. Удаление старых пользователей
    await c.query("DELETE FROM users WHERE email = ANY($1)", [
      USERS.map((u) => u.email.toLowerCase()),
    ]);

    const hash = await bcrypt.hash(PASSWORD, 10);
    const uid = {};
    for (const u of USERS) {
      const { rows } = await c.query(
        `INSERT INTO users (name, email, password_hash, created_at)
        VALUES ($1, $2, $3, now() - interval '60 days') RETURNING id`,
        [u.name, u.email.toLowerCase(), hash]
      );
      uid[u.key] = rows[0].id;
    }

    let taskTotal = 0;

    for (const b of BOARDS) {
      const ownerId = uid[b.owner];
      const updatedAt = new Date(Date.now() - b.updatedDaysAgo * DAY);

      const { rows: br } = await c.query(
        `INSERT INTO boards (title, description, color, owner_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, now() - interval '45 days', $5) RETURNING id`,
        [b.title, b.description, b.color, ownerId, updatedAt]
      );
      const boardId = br[0].id;

      let memberKeys = [b.owner, ...b.members];
      if (!memberKeys.includes("Алексей")) memberKeys.push("Алексей");
      memberKeys = [...new Set(memberKeys)];

      for (let mi = 0; mi < memberKeys.length; mi++) {
        const mk = memberKeys[mi];
        // Владелец - owner, первый из списка - admin, остальные - member
        const role = mk === b.owner ? "owner" : (mi === 1 ? "admin" : "member");
        await c.query(
          `INSERT INTO board_members (board_id, user_id, role)
          VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [boardId, uid[mk], role]
        );
      }

      const colIds = [];
      for (let i = 0; i < COLUMNS.length; i++) {
        const { rows: cr } = await c.query(
          `INSERT INTO columns (board_id, title, position, color) VALUES ($1, $2, $3, $4) RETURNING id`,
          [boardId, COLUMNS[i], (i + 1) * 1000, COL_COLORS[i % COL_COLORS.length]]
        );
        colIds.push(cr[0].id);
      }

      const assignPool = ["Алексей", "Алексей", ...memberKeys];

      for (let i = 0; i < b.tasks.length; i++) {
        const colIdx = COL_CYCLE[i % COL_CYCLE.length];
        const priority = PRIO_CYCLE[(i + b.title.length) % PRIO_CYCLE.length];
        const offset = DUE_CYCLE[(i + b.tasks.length) % DUE_CYCLE.length];
        const dueDate = offset === null ? null : new Date(Date.now() + offset * DAY);
        const assigneeKey = i % 5 === 4 ? null : assignPool[i % assignPool.length];
        const assigneeId = assigneeKey ? uid[assigneeKey] : null;

        const { rows: tr } = await c.query(
          `INSERT INTO tasks
           (board_id, column_id, title, description, priority, due_date, assignee_id, position, created_by, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now() - interval '20 days', $10) RETURNING id`,
          [
            boardId,
            colIds[colIdx],
            b.tasks[i],
            i % 3 === 0 ? `${b.tasks[i]} - детали и критерии приемки.` : null,
            priority,
            dueDate,
            assigneeId,
            (i + 1) * 1000,
            ownerId,
            updatedAt,
          ]
        );
        const taskId = tr[0].id;
        taskTotal += 1;

        // Создаем демо-уведомление, если задачу назначили не владельцу
        if (assigneeId && assigneeId !== ownerId && i % 4 === 0) {
          await c.query(
            `INSERT INTO notifications (user_id, actor_id, board_id, task_id, kind, title, body, link)
             VALUES ($1, $2, $3, $4, 'assigned', 'Новая задача', $5, $6)`,
            [
              assigneeId, ownerId, boardId, taskId,
              `Вас назначили на задачу «${b.tasks[i]}» на доске «${b.title}»`,
              `/board/${boardId}?task=${taskId}`
            ]
          );
        }
      }

      // Создаем демо-уведомление о приглашении на доску для одного из участников
      if (b.members.length > 0 && b.owner !== "Алексей") {
        const invitedUserId = uid[b.members[0]];
        await c.query(
          `INSERT INTO notifications (user_id, actor_id, board_id, kind, title, body, link)
           VALUES ($1, $2, $3, 'invite', 'Приглашение на доску', $4, $5)`,
          [
            invitedUserId, ownerId, boardId,
            `${USERS.find(u => u.key === b.owner)?.name} добавил(а) вас на доску «${b.title}»`,
            `/board/${boardId}`
          ]
        );
      }

      const ownerName = USERS.find((u) => u.key === b.owner).name;
      const acts = [
        { action: "board.created", message: `${ownerName} создал(а) доску` },
        { action: "task.created", message: `${ownerName} добавил(а) задачу "${b.tasks[0]}"` },
        { action: "task.moved", message: `${USERS.find((u) => u.key === memberKeys[1] || u.key === b.owner)?.name || ownerName} переместил(а) "${b.tasks[Math.min(3, b.tasks.length - 1)]}" в колонку Выполнено` },
      ];
      for (let ai = 0; ai < acts.length; ai++) {
        await c.query(
          `INSERT INTO activities (board_id, user_id, action, message, created_at)
          VALUES ($1, $2, $3, $4, now() - ($5 || ' hours') :: interval)`,
          [boardId, ownerId, acts[ai].action, acts[ai].message, (ai + 1) * 7]
        );
      }
    }

    return taskTotal;
  }).then((taskTotal) => {
    console.log("✅ Демо-пространство успешно создано.");
    console.log(`Пользователи: ${USERS.length} | Доски: ${BOARDS.length} | Задачи: ${taskTotal}`);
    console.log("Логин: alex@novreg.ru / Пароль: Test@1234");
    console.log("(у всех коллег одинаковый пароль)");
  });
};

run()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());