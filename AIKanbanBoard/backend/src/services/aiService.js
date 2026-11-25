const ApiError = require("../utils/ApiError");

const YANDEX_API_URL = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";
const REQUEST_TIMEOUT_MS = 30_000;

const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];

// Вспомогательная функция для отправки запросов
const runPrompt = async (prompt, { maxTokens = 2000, temperature = 0.2 } = {}) => {
  const folderId = process.env.YANDEX_FOLDER_ID;
  const apiKey = process.env.YANDEX_API_KEY;

  if (!folderId || !apiKey) {
    throw new ApiError(503, "YandexGPT API keys are not configured on the server");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(YANDEX_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Api-Key ${apiKey}`,
      },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/yandexgpt-lite/latest`,
        completionOptions: { stream: false, temperature, maxTokens: String(maxTokens) },
        messages: [
          { role: "system", text: "Ты — полезный ассистент. Отвечай только чистым JSON без Markdown и пояснений." },
          { role: "user", text: prompt },
        ],
      }),
    });
  } catch (err) {
    if (err.name === "AbortError") throw new ApiError(504, "Сервис ИИ не ответил вовремя.");
    console.error("YandexGPT network error:", err.message);
    throw new ApiError(502, "Не удалось получить ответ от ИИ.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    console.error("YandexGPT API Error:", response.status, raw.slice(0, 500));
    if (response.status === 429) throw new ApiError(429, "Превышен лимит запросов к ИИ. Попробуйте позже.");
    if (response.status === 401 || response.status === 403) {
      throw new ApiError(503, "Ключ ИИ недействителен или у сервисного аккаунта нет прав.");
    }
    throw new ApiError(502, "Сервис ИИ временно недоступен.");
  }

  const data = await response.json();
  const text = data?.result?.alternatives?.[0]?.message?.text;
  
  if (typeof text !== "string" || !text.trim()) {
    throw new ApiError(502, "ИИ вернул пустой ответ.");
  }

  // Логируем расход токенов для мониторинга
  const usage = data.result.usage ?? {};
  console.info(JSON.stringify({ 
    evt: "yandexgpt_call", 
    input: Number(usage.inputTextTokens ?? 0),
    output: Number(usage.completionTokens ?? 0),
    total: Number(usage.totalTokens ?? 0),
  }));

  return text;
};

// Корректный поиск JSON с учётом вложенности и строк
const extractJson = (text) => {
  const start = text.search(/[[{]/);
  if (start === -1) throw new ApiError(502, "ИИ вернул неожиданный ответ");

  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch {
        throw new ApiError(502, "Не удалось распарсить ответ от ИИ (невалидный JSON)");
      }
    }
  }
  throw new ApiError(502, "Не удалось найти JSON в ответе ИИ");
};

const normalizeTask = (t) => {
  if (!t || typeof t !== "object") return null;
  const priority = String(t.priority || "").toLowerCase();
  return {
    title: String(t.title || t.name || "").trim().slice(0, 200),
    description: String(t.description || "").trim().slice(0, 1000),
    priority: VALID_PRIORITIES.includes(priority) ? priority : "medium",
  };
};

const clampCount = (n, def, max = 15) => {
  const v = Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : def;
  return Math.min(Math.max(v, 1), max);
};

const generateTasks = async (goal, count = 6) => {
  const safeCount = clampCount(count, 6);
  const prompt = `Ты — опытный менеджер проектов. Разбей следующую цель на ${safeCount} конкретных, выполнимых задач для Kanban-доски.
Цель: "${goal}"

Ответ должен быть ТОЛЬКО в виде JSON-массива. Каждый элемент: { "title": string, "description": string (1-2 предложения), "priority": "low" | "medium" | "high" | "urgent" }. Никакого текста вокруг, только чистый JSON.`;

  const text = await runPrompt(prompt);
  const json = extractJson(text);
  
  if (!Array.isArray(json)) throw new ApiError(502, "ИИ не вернул список задач");
  return json.map(normalizeTask).filter((t) => t && t.title);
};

const breakdownTask = async (title, description = "", count = 5) => {
  const safeCount = clampCount(count, 5, 12);
  const prompt = `Разбей следующую задачу на ${safeCount} более мелких последовательных подзадач.
Название задачи: "${title}"
Детали: "${description || "нет"}"

Ответ должен быть ТОЛЬКО в виде JSON-массива. Каждый элемент: { "title": string, "description": string (кратко), "priority": "low" | "medium" | "high" | "urgent" }. Никакого текста вокруг, только чистый JSON.`;

  const text = await runPrompt(prompt);
  const json = extractJson(text);

  if (!Array.isArray(json)) throw new ApiError(502, "ИИ не вернул список подзадач");
  return json.map(normalizeTask).filter((t) => t && t.title);
};

const summarizeBoard = async ({ boardTitle, columns }) => {
  const snapshot = columns
    .map(
      (c) =>
        `${c.title} (${c.tasks.length}):\n` +
        (c.tasks.map((t) => ` - ${t.title} [${t.priority}]`).join("\n") || " (пусто)")
    )
    .join("\n\n");

  // Ограничиваем размер промпта (чтобы не превысить лимит токенов и не платить лишнего)
  const safeSnapshot = snapshot.slice(0, 15000); 

  const prompt = `Ты — скрам-мастер. Напиши краткое резюме спринта для Kanban-доски "${boardTitle}".
Текущее состояние доски:
${safeSnapshot}

Ответ должен быть ТОЛЬКО в виде JSON-объекта со строго следующими полями:
{
  "headline": "одно предложение с обзором",
  "completed": ["ключевые выполненные задачи"],
  "inProgress": ["что сейчас в работе"],
  "risks": ["блокеры, риски или просроченные задачи"],
  "recommendations": ["следующие приоритеты"]
}
Никакого текста вокруг, только чистый JSON.`;

  const text = await runPrompt(prompt);
  return extractJson(text);
};

module.exports = { generateTasks, breakdownTask, summarizeBoard };