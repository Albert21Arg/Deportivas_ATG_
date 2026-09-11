import { getPublicHistory, getPublicTournament, listPublicTournaments } from '../services/public-service.js';

function parseId(request) {
  const id = Number(request.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error('Identificador de torneo no válido');
    error.statusCode = 400;
    throw error;
  }
  return id;
}

export async function listController(_request, response, next) {
  try {
    return response.json({ success: true, data: { tournaments: await listPublicTournaments() } });
  } catch (error) {
    return next(error);
  }
}

export async function detailController(request, response, next) {
  try {
    return response.json({ success: true, data: await getPublicTournament(parseId(request)) });
  } catch (error) {
    return next(error);
  }
}

export async function historyController(request, response, next) {
  try {
    return response.json({ success: true, data: { matches: await getPublicHistory(parseId(request)) } });
  } catch (error) {
    return next(error);
  }
}
