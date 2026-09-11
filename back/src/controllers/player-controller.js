import fs from 'node:fs';
import { createPlayer, listPlayers, updatePlayer } from '../services/player-service.js';

function stripPhotoIfNotSuperAdmin(request) {
  if (request.user.role === 'SUPERADMIN') return;
  if (request.file) fs.unlink(request.file.path, () => {});
  delete request.validatedBody.photo;
}

export async function listController(request, response, next) { try { return response.json({ success: true, data: { players: await listPlayers(request.tournamentId, request.params.teamId) } }); } catch (error) { return next(error); } }
export async function createController(request, response, next) { try { stripPhotoIfNotSuperAdmin(request); return response.status(201).json({ success: true, data: { player: await createPlayer(request.tournamentId, request.params.teamId, request.validatedBody) } }); } catch (error) { return next(error); } }
export async function updateController(request, response, next) { try { stripPhotoIfNotSuperAdmin(request); return response.json({ success: true, data: { player: await updatePlayer(request.tournamentId, request.params.teamId, request.params.playerId, request.validatedBody) } }); } catch (error) { return next(error); } }
