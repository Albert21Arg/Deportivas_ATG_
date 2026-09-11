export function getApiErrorDetails(error) {
  if (!error.response) {
    return {
      title: 'No se pudo conectar',
      message: 'No fue posible comunicarse con el servidor. Comprueba que el backend esté activo e inténtalo nuevamente.',
    };
  }

  const { status, data } = error.response;
  const serverMessage = data?.message;
  const requestUrl = error.config?.url ?? '';

  if (status === 401) {
    return {
      title: requestUrl.includes('/auth/login') ? 'Credenciales incorrectas' : 'Sesión no válida',
      message: `${serverMessage ?? (requestUrl.includes('/auth/login')
        ? 'El email o la contraseña no son válidos, o el usuario está inactivo.'
        : 'Tu sesión expiró o no tienes un token válido. Inicia sesión nuevamente.')} (HTTP 401).`,
    };
  }

  if (status === 400) {
    return {
      title: 'Solicitud incorrecta',
      message: `${serverMessage ?? 'El servidor no pudo interpretar los datos enviados.'} (HTTP 400).`,
    };
  }

  if (status === 403) {
    return {
      title: 'Acceso denegado',
      message: `${serverMessage ?? 'Tu usuario no tiene permisos para realizar esta operación.'} (HTTP 403).`,
    };
  }

  if (status === 404) {
    return {
      title: 'Recurso no encontrado',
      message: `${serverMessage ?? 'El torneo, equipo o partido solicitado no existe.'} (HTTP 404).`,
    };
  }

  if (status === 409) {
    return {
      title: 'Operación no permitida',
      message: `${serverMessage ?? 'La operación entra en conflicto con el estado actual del sistema.'} (HTTP 409).`,
    };
  }

  if (status === 422) {
    return {
      title: 'Revisa los datos',
      message: `${serverMessage ?? 'Hay datos inválidos en el formulario.'} (HTTP 422).`,
    };
  }

  if (status === 429) {
    return {
      title: 'Demasiados intentos',
      message: serverMessage ?? 'Has superado el límite de intentos. Espera unos minutos antes de volver a intentarlo.',
    };
  }

  if (status >= 500) {
    return {
      title: 'Error del servidor',
      message: 'El servidor encontró un problema. Inténtalo nuevamente más tarde.',
    };
  }

  return {
    title: `No se pudo completar la solicitud (${status})`,
    message: `${serverMessage ?? 'Ocurrió un error inesperado. Revisa los datos e inténtalo nuevamente.'} (HTTP ${status}).`,
  };
}
