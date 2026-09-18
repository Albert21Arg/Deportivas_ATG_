import fs from 'node:fs';
import { createPlayer, deletePlayer, listPlayers, setGoalkeeper, setShowName, updatePlayer } from '../services/player-service.js';
import { HttpError } from '../utils/http-error.js';

function stripSuperAdminOnlyFields(request) {
  if (request.user.role === 'SUPERADMIN') return;
  if (request.file) fs.unlink(request.file.path, () => {});
  delete request.validatedBody.photo;
  delete request.validatedBody.paidUntil;
  delete request.validatedBody.fixedOvr;
}

// El DT solo puede inscribir nombre y dorsal: cualquier otro campo que
// llegue en el body (foto, documento, fecha de nacimiento, estado...) se
// descarta, sin importar lo que mande el frontend.
function stripToDtAllowedFields(request) {
  if (request.user.role !== 'DT') return;
  if (request.file) fs.unlink(request.file.path, () => {});
  const { name, jerseyNumber } = request.validatedBody;
  request.validatedBody = { name, jerseyNumber };
}

function requireSuperAdmin(request) {
  if (request.user.role !== 'SUPERADMIN') throw new HttpError(403, 'Solo el superadmin puede hacer esto');
}

export async function listController(request, response, next) { try { return response.json({ success: true, data: { players: await listPlayers(request.tournamentId, request.params.teamId) } }); } catch (error) { return next(error); } }
export async function createController(request, response, next) { try { stripSuperAdminOnlyFields(request); stripToDtAllowedFields(request); return response.status(201).json({ success: true, data: { player: await createPlayer(request.tournamentId, request.params.teamId, request.validatedBody) } }); } catch (error) { return next(error); } }
export async function updateController(request, response, next) { try { stripSuperAdminOnlyFields(request); stripToDtAllowedFields(request); return response.json({ success: true, data: { player: await updatePlayer(request.tournamentId, request.params.teamId, request.params.playerId, request.validatedBody) } }); } catch (error) { return next(error); } }
export async function deleteController(request, response, next) { try { await deletePlayer(request.tournamentId, request.params.teamId, request.params.playerId); return response.json({ success: true, data: null }); } catch (error) { return next(error); } }
export async function setGoalkeeperController(request, response, next) { try { return response.json({ success: true, data: { player: await setGoalkeeper(request.tournamentId, request.params.teamId, request.params.playerId, request.validatedBody.isGoalkeeper) } }); } catch (error) { return next(error); } }
export async function setShowNameController(request, response, next) { try { requireSuperAdmin(request); return response.json({ success: true, data: { player: await setShowName(request.tournamentId, request.params.teamId, request.params.playerId, request.validatedBody.showName) } }); } catch (error) { return next(error); } }
