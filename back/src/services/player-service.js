import * as repository from '../repositories/player-repository.js';
import { HttpError } from '../utils/http-error.js';

function id(value) { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed <= 0) throw new HttpError(400, 'Identificador no válido'); return parsed; }
function withAge(player) { const now = new Date(); const birth = new Date(player.birthDate); let age = now.getFullYear() - birth.getFullYear(); const beforeBirthday = now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()); return { ...player, age: age - Number(beforeBirthday) }; }
async function assertTeam(tournamentId, teamId) { if (!await repository.findTeamInTournament(id(teamId), id(tournamentId))) throw new HttpError(404, 'El equipo no pertenece a este torneo'); }
export async function listPlayers(tournamentId, teamId) { await assertTeam(tournamentId, teamId); return (await repository.findForTeam(id(teamId))).map(({ player }) => withAge(player)); }
export async function createPlayer(tournamentId, teamId, data) { await assertTeam(tournamentId, teamId); const result = await repository.createAndAssign(data, id(teamId)); if (result.conflict) throw new HttpError(409, `El jugador ya pertenece al equipo ${result.conflict}`); return withAge(result.player); }
export async function updatePlayer(tournamentId, teamId, playerId, data) { await assertTeam(tournamentId, teamId); const player = await repository.findById(id(playerId)); if (!player) throw new HttpError(404, 'Jugador no encontrado'); return withAge(await repository.update(player.id, data)); }
