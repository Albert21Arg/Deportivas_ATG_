export function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode ?? 500;
  const message = statusCode >= 500 ? 'Error interno del servidor' : error.message;

  if (statusCode >= 500) {
    console.error(error);
  }

  response.status(statusCode).json({
    success: false,
    message,
    ...(error.code && statusCode < 500 ? { code: error.code } : {}),
  });
}
