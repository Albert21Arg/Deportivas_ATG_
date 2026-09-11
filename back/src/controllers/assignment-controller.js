import {
  assignAdmin,
  listTournamentAdmins,
  removeAdmin,
} from '../services/user-service.js';

export async function listController(request, response, next) {
  try {
    const admins = await listTournamentAdmins(request.tournamentId);
    return response.json({ success: true, data: { admins } });
  } catch (error) {
    return next(error);
  }
}

export async function assignController(request, response, next) {
  try {
    const assignment = await assignAdmin(request.tournamentId, request.validatedBody.userId);
    return response.status(201).json({ success: true, data: { assignment } });
  } catch (error) {
    return next(error);
  }
}

export async function removeController(request, response, next) {
  try {
    await removeAdmin(request.tournamentId, request.userId);
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}
