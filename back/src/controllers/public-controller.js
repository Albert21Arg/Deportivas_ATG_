import { getHomeTournament, getPublicHistory, getPublicTournament, listHomeTournaments, listPublicTournaments } from '../services/public-service.js';
import { likeTournament, unlikeTournament } from '../services/tournament-like-service.js';
import { recordVisit } from '../services/tournament-view-service.js';

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

export async function homeListController(_request, response, next) {
  try {
    return response.json({ success: true, data: { tournaments: await listHomeTournaments() } });
  } catch (error) {
    return next(error);
  }
}

export async function homeDetailController(request, response, next) {
  try {
    return response.json({ success: true, data: await getHomeTournament(parseId(request)) });
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

export async function visitController(request, response, next) {
  try {
    await recordVisit(parseId(request), request.ip);
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
}

export async function likeController(request, response, next) {
  try {
    const result = await likeTournament(parseId(request), request.ip);
    return response.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function unlikeController(request, response, next) {
  try {
    const result = await unlikeTournament(parseId(request), request.ip);
    return response.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}
