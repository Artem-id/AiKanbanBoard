const { query }= require("../config/db");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { emitToBoard } = require("../realtime");

const createColumn = asyncHandler(async (req, res) => {
  const title = (req.body.title || "").trim();
  const color = req.body.color || null; // <-- ДОБАВИТЬ
  if (!title) throw ApiError.badRequest("Название колонки обязательно");

  const posRes = await query(
    "SELECT COALESCE(MAX(position), 0) + 1000 AS pos FROM columns WHERE board_id = $1",
    [req.board.id]
  );
  
  const { rows } = await query(
    `INSERT INTO columns (board_id, title, position, color) VALUES ($1, $2, $3, $4) RETURNING *`, // <-- ДОБАВИТЬ color
    [req.board.id, title, posRes.rows[0].pos, color]
  );
  
  emitToBoard(req.board.id, "column:created", rows[0]);
  res.status(201).json({ column: rows[0] });
});

const updateColumn = asyncHandler(async (req, res) => {
  const { title, position, color } = req.body; // <-- ДОБАВИТЬ color
  const { rows } = await query(
    `UPDATE columns
      SET title = COALESCE($3, title),
        position = COALESCE($4, position),
        color = COALESCE($5, color) -- <-- ДОБАВИТЬ
     WHERE id = $1 AND board_id = $2
     RETURNING *`,
    [req.params.columnId, req.board.id, title ?? null, position ?? null, color ?? null] // <-- ДОБАВИТЬ color
  );
  if (!rows.length) throw ApiError.notFound("Колонка не найдена");
  emitToBoard(req.board.id, "column:updated", rows[0]);
  res.json({ column: rows[0] });
});

const deleteColumn = asyncHandler(async (req, res) => {
  const result = await query(
    "DELETE FROM columns WHERE id = $1 AND board_id = $2",
    [req.params.columnId, req.board.id]
  );
  if (!result.rowCount) throw ApiError.notFound("Колонка не найдена");
  emitToBoard(req.board.id, "column:deleted", { id: req.params.columnId });
  res.json({ success: true });
});

const moveColumn = asyncHandler(async (req, res) => {
  const { position } = req.body;
  if (position === undefined) throw ApiError.badRequest("Не указана позиция");

  const { rows } = await query(
    `UPDATE columns SET position = $3 WHERE id = $1 AND board_id = $2 RETURNING *`,
    [req.params.columnId, req.board.id, position]
  );
  if (!rows.length) throw ApiError.notFound("Колонка не найдена");

  emitToBoard(req.board.id, "column:moved", rows[0]);
  res.json({ column: rows[0] });
});

module.exports = {createColumn, updateColumn, deleteColumn, moveColumn};