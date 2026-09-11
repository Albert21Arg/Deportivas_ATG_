import { getStandings, getStandingsByPot, getTopScorers } from '../services/standings-service.js';

export async function getController(request, response, next) {
  try {
    const groupId = request.query.groupId ? Number(request.query.groupId) : null;
    const standings = await getStandings(request.tournamentId, groupId);
    return response.json({ success: true, data: { standings } });
  } catch (error) {
    return next(error);
  }
}

export async function getByPotController(request, response, next) {
  try {
    const pots = await getStandingsByPot(request.tournamentId);
    return response.json({ success: true, data: { pots } });
  } catch (error) {
    return next(error);
  }
}

export async function getScorersController(request, response, next) {
  try {
    const scorers = await getTopScorers(request.tournamentId);
    return response.json({ success: true, data: { scorers } });
  } catch (error) {
    return next(error);
  }
}
