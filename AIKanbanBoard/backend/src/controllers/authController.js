const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const { signToken } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  avatar_url: u.avatar_url,
  created_at: u.created_at,
});

const register = asyncHandler(async (req, res) => {
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const { password } = req.body;

  if (!name) throw ApiError.badRequest("Имя обязательно");
  if (!EMAIL_RE.test(email)) throw ApiError.badRequest("Введите корректный email");
  if (!password || password.length < 6)
    throw ApiError.badRequest("Пароль должен быть не менее 6 символов");

  const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length) throw ApiError.conflict("Этот email уже зарегистрирован");

  const password_hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, name, email, avatar_url, created_at`,
    [name, email, password_hash]
  );

  const user = rows[0];
  const token = signToken({ id: user.id, email: user.email, name: user.name });
  res.status(201).json({ user: publicUser(user), token });
});

const login = asyncHandler(async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const { password } = req.body;

  if (!email || !password) throw ApiError.badRequest("Введите email и пароль");

  const { rows } = await query("SELECT * FROM users WHERE email = $1", [email]);
  const user = rows[0];
  if (!user) throw ApiError.unauthorized("Неверный email или пароль");

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw ApiError.unauthorized("Неверный email или пароль");

  const token = signToken({ id: user.id, email: user.email, name: user.name });
  res.json({ user: publicUser(user), token });
});

const me = asyncHandler(async (req, res) => {
  const { rows } = await query(
    "SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1",
    [req.user.id]
  );
  if (!rows.length) throw ApiError.notFound("Пользователь не найден");
  res.json({ user: rows[0] });
});

// НОВАЯ ФУНКЦИЯ: удаление аккаунта
const deleteAccount = asyncHandler(async (req, res) => {
  // Удаляем пользователя (каскадно удалятся его доски, задачи и т.д.)
  await query("DELETE FROM users WHERE id = $1", [req.user.id]);
  res.json({ success: true });
});

module.exports = { register, login, me, deleteAccount };