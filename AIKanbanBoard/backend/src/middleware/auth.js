const { verifyToken } = require("../utils/jwt");
const ApiError = require("../utils/ApiError");

const requireAuth = (req, _res, next) => {
try {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized("Отсутствует токен аутентификации");

    const decoded = verifyToken(token);
    req. user = { id: decoded. id, email: decoded.email, name: decoded.name };
    next();
} catch (err) {
  if (err.isApiError) return next(err);
  next(ApiError.unauthorized("Недействительный или истекший токен"));
}
};
module. exports = { requireAuth };