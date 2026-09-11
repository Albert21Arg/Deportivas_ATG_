import { addEvent, changeStatus, createMatch, deleteEvent, generateFixtures, listMatches, registerResult, updateLiveScore, updateMatch } from '../services/match-service.js';

export async function listController(request, response, next) {
  try {
    return response.json({ success: true, data: { matches: await listMatches(request.tournamentId) } });
  } catch (error) {
    return next(error);
  }
}

export async function createController(request, response, next) {
  try {
    return response.status(201).json({ success: true, data: { match: await createMatch(request.tournamentId, request.validatedBody) } });
  } catch (error) {
    return next(error);
  }
}

export async function generateFixturesController(request, response, next) {
  try {
    const result = await generateFixtures(request.tournamentId, request.validatedBody ?? {});
    return response.status(201).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function updateController(request, response, next) {
  try {
    return response.json({ success: true, data: { match: await updateMatch(request.matchId, request.validatedBody) } });
  } catch (error) {
    return next(error);
  }
}

export async function resultController(request, response, next) {
  try {
    return response.json({ success: true, data: { match: await registerResult(request.matchId, request.validatedBody, request.user) } });
  } catch (error) {
    return next(error);
  }
}

export async function statusController(request, response, next) {
  try {
    return response.json({ success: true, data: { match: await changeStatus(request.matchId, request.status, request.validatedBody?.penalties) } });
  } catch (error) {
    return next(error);
  }
}
export async function eventController(request, response, next) { try { return response.status(201).json({ success: true, data: { match: await addEvent(request.matchId, request.validatedBody) } }); } catch (error) { return next(error); } }
export async function deleteEventController(request, response, next) { try { return response.json({ success: true, data: { match: await deleteEvent(request.matchId, request.params.eventId) } }); } catch (error) { return next(error); } }
export async function liveScoreController(request, response, next) { try { return response.json({ success: true, data: { match: await updateLiveScore(request.matchId, request.validatedBody) } }); } catch (error) { return next(error); } }
