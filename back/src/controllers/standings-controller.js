import { getCardFines, getGoalkeepers, getStandings, getStandingsByPot, getTopCards, getTopScorers } from '../services/standings-service.js';
import { setCardFinePaid } from '../services/player-service.js';

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

export async function getGoalkeepersController(request, response, next) {
  try {
    const goalkeepers = await getGoalkeepers(request.tournamentId);
    return response.json({ success: true, data: { goalkeepers } });
  } catch (error) {
    return next(error);
  }
}

export async function getCardsController(request, response, next) {
  try {
    const cards = await getTopCards(request.tournamentId);
    return response.json({ success: true, data: { cards } });
  } catch (error) {
    return next(error);
  }
}

export async function getCardFinesController(request, response, next) {
  try {
    const teams = await getCardFines(request.tournamentId);
    return response.json({ success: true, data: { teams } });
  } catch (error) {
    return next(error);
  }
}

export async function setCardFinePaidController(request, response, next) {
  try {
    const player = await setCardFinePaid(
      request.tournamentId,
      request.params.playerId,
      request.body?.cardType,
      Boolean(request.body?.paid)
    );
    return response.json({ success: true, data: { player } });
  } catch (error) {
    return next(error);
  }
}
