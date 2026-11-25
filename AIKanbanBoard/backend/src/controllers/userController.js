const { query } = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const searchUsers = asyncHandler(async (req, res) => {
  const q = (req.query.q || "").trim();
  // Если ввели меньше 2 символов — ничего не возвращаем (чтобы не грузить базу)
  if (q.length < 2) return res.json({ users: [] });

  const searchTerm = `%${q}%`;
  
  const { rows } = await query(
    `SELECT id, name, email, avatar_url 
     FROM users 
     WHERE name ILIKE $1 OR email ILIKE $1
     ORDER BY name ASC
     LIMIT 10`,
    [searchTerm]
  );
  
  res.json({ users: rows });
});

const findByEmail = asyncHandler(async (req, res) => {
  const email = (req.query.email || "").trim().toLowerCase();
  if (!email) return res.json({ user: null });

  const { rows } = await query(
    "SELECT id, name, email, avatar_url FROM users WHERE email = $1",
    [email]
  );
  res.json({ user: rows[0] || null });
});

module.exports = { searchUsers, findByEmail} ;