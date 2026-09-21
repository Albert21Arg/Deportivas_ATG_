import { createTeam, getMyTeamContext, getTeam, listTeams, updateTeam } from '../services/team-service.js';

export async function meController(request, response, next) {
  try {
    const context = await getMyTeamContext(request.user.teamId);
    return response.json({ success: true, data: context });
  } catch (error) {
    return next(error);
  }
}

export async function listController(_request, response, next) {
  try {
    return response.json({ success: true, data: { teams: await listTeams() } });
  } catch (error) {
    return next(error);
  }
}

export async function getController(request, response, next) {
  try {
    return response.json({ success: true, data: { team: await getTeam(request.teamId) } });
  } catch (error) {
    return next(error);
  }
}

export async function createController(request, response, next) {
  try {
    const team = await createTeam(request.validatedBody, request.user.role);
    return response.status(201).json({ success: true, data: { team } });
  } catch (error) {
    return next(error);
  }
}

export async function updateController(request, response, next) {
  try {
    return response.json({ success: true, data: { team: await updateTeam(request.teamId, request.validatedBody, request.user.role) } });
  } catch (error) {
    return next(error);
  }
}

export async function deleteController(request, response, next) {
  try {
    // Esta ruta ya está restringida a SUPERADMIN (authorize en el router).
    const team = await updateTeam(request.teamId, { status: 'INACTIVE' }, 'SUPERADMIN');
    return response.json({ success: true, data: { team } });
  } catch (error) {
    return next(error);
  }
}
