class ApiError extends Error {
  constructor(statusCode, message) {
    super (message);
    this.statusCode = statusCode;
    this.isApiError = true;
  }

  static badRequest(msg) {
    return new ApiError(400, msg);
  }
  static unauthorized(msg = "Не авторизован") {
    return new ApiError(401, msg);
  }
  static forbidden(msg = "Доступ запрещен") {
    return new ApiError(403, msg);
  }  
  static notFound(msg = "Не найдено") {
    return new ApiError(404, msg);
  }
  static conflict(msg) {
    return new ApiError(409, msg);
  }
}

module.exports = ApiError;