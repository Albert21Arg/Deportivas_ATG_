import { assignTeamToGroup, createGroup, deleteGroup, drawGroups, listGroups, removeTeamFromGroup, resetGroups } from '../services/group-service.js';

export async function listController(request, response, next) {
  try {
    return response.json({ success: true, data: { groups: await listGroups(request.tournamentId) } });
  } catch (error) {
    return next(error);
  }
}

export async function createController(request, response, next) {
  try {
    const group = await createGroup(request.tournamentId, request.validatedBody.name);
    return response.status(201).json({ success: true, data: { group } });
  } catch (error) {
    return next(error);
  }
}

export async function deleteController(request, response, next) {
  try {
    await deleteGroup(request.tournamentId, request.groupId);
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function resetController(request, response, next) {
  try {
    await resetGroups(request.tournamentId);
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function assignTeamController(request, response, next) {
  try {
    const assignment = await assignTeamToGroup(request.tournamentId, request.groupId, request.validatedBody.teamId, request.validatedBody.pot);
    return response.status(201).json({ success: true, data: { assignment } });
  } catch (error) {
    return next(error);
  }
}

export async function removeTeamController(request, response, next) {
  try {
    await removeTeamFromGroup(request.tournamentId, request.groupId, request.teamId);
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
}

export async function drawController(request, response, next) {
  try {
    const groups = await drawGroups(request.tournamentId, request.validatedBody);
    return response.status(201).json({ success: true, data: { groups } });
  } catch (error) {
    return next(error);
  }
}
