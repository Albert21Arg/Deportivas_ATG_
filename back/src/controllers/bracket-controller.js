import { createBracket, listBracket, resetBracket, setWinnerManually } from '../services/bracket-service.js';

export async function listController(request, response, next) {
  try {
    return response.json({ success: true, data: { ties: await listBracket(request.tournamentId) } });
  } catch (error) {
    return next(error);
  }
}

export async function createController(request, response, next) {
  try {
    const ties = await createBracket(request.tournamentId, request.validatedBody);
    return response.status(201).json({ success: true, data: { ties } });
  } catch (error) {
    return next(error);
  }
}

export async function resetController(request, response, next) {
  try {
    await resetBracket(request.tournamentId);
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function winnerController(request, response, next) {
  try {
    const tie = await setWinnerManually(request.tournamentId, request.tieId, request.validatedBody.winnerTeamId);
    return response.json({ success: true, data: { tie } });
  } catch (error) {
    return next(error);
  }
}
