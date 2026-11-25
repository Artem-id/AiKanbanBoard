const errorHandler = (err, _req, res, _next) => {
const status = err.statusCode || 500;

  if (err.code === "23505") {
   return res.status(409).json({ error: "Ресурс уже существует" });
  }

  res.status(status).json({
   error: status >= 500 ? "Внутренняя ошибка сервера" : err.message,
  });

};

const notFoundHandler = (_req, res) => {
  res.status(404).json({ error: "Маршрут не найден" });
};

module.exports={errorHandler, notFoundHandler};