import { getTeamDt, upsertTeamDt } from '../services/dt-service.js';

export async function getController(request, response, next) {
  try {
    const dt = await getTeamDt(request.tournamentId, request.params.teamId);
    return response.json({ success: true, data: { dt } });
  } catch (error) {
    return next(error);
  }
}

export async function upsertController(request, response, next) {
  try {
    const dt = await upsertTeamDt(request.tournamentId, request.params.teamId, request.validatedBody);
    return response.json({ success: true, data: { dt } });
  } catch (error) {
    return next(error);
  }
}
