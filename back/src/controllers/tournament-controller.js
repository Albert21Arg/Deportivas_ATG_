import {
  createTournament,
  getTournament,
  listTournaments,
  setChampion,
  updateTournament,
  updateTournamentStatus,
} from '../services/tournament-service.js';

export async function listController(request, response, next) {
  try {
    const tournaments = await listTournaments(request.user);
    return response.json({ success: true, data: { tournaments } });
  } catch (error) {
    return next(error);
  }
}

export async function getController(request, response, next) {
  try {
    const tournament = await getTournament(request.tournamentId);
    return response.json({ success: true, data: { tournament } });
  } catch (error) {
    return next(error);
  }
}

export async function createController(request, response, next) {
  try {
    const tournament = await createTournament(request.validatedBody);
    return response.status(201).json({ success: true, data: { tournament } });
  } catch (error) {
    return next(error);
  }
}

export async function updateController(request, response, next) {
  try {
    const tournament = await updateTournament(request.tournamentId, request.validatedBody);
    return response.json({ success: true, data: { tournament } });
  } catch (error) {
    return next(error);
  }
}

export async function updateModeController(request, response, next) {
  try {
    const tournament = await updateTournament(request.tournamentId, request.validatedBody);
    return response.json({ success: true, data: { tournament } });
  } catch (error) {
    return next(error);
  }
}

export async function statusController(request, response, next) {
  try {
    const tournament = await updateTournamentStatus(request.tournamentId, request.validatedBody.status);
    return response.json({ success: true, data: { tournament } });
  } catch (error) {
    return next(error);
  }
}

export async function championController(request, response, next) {
  try {
    const tournament = await setChampion(request.tournamentId, request.validatedBody);
    return response.json({ success: true, data: { tournament } });
  } catch (error) {
    return next(error);
  }
}
