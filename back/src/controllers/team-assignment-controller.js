import { assignTeam, listTournamentTeams, removeTeam } from '../services/team-service.js';

export async function listController(request, response, next) {
  try {
    return response.json({ success: true, data: { teams: await listTournamentTeams(request.tournamentId) } });
  } catch (error) {
    return next(error);
  }
}

export async function assignController(request, response, next) {
  try {
    const assignment = await assignTeam(request.tournamentId, request.validatedBody.teamId);
    return response.status(201).json({ success: true, data: { assignment } });
  } catch (error) {
    return next(error);
  }
}

export async function removeController(request, response, next) {
  try {
    await removeTeam(request.tournamentId, request.teamId);
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}
