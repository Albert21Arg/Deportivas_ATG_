import { createAnnouncement, deleteAnnouncement, getActiveAnnouncement, listAnnouncements, updateAnnouncement } from '../services/announcement-service.js';

export async function listController(_request, response, next) {
  try { return response.json({ success: true, data: { announcements: await listAnnouncements() } }); } catch (error) { return next(error); }
}

export async function createController(request, response, next) {
  try { return response.status(201).json({ success: true, data: { announcement: await createAnnouncement(request.validatedBody) } }); } catch (error) { return next(error); }
}

export async function updateController(request, response, next) {
  try { return response.json({ success: true, data: { announcement: await updateAnnouncement(request.params.id, request.validatedBody) } }); } catch (error) { return next(error); }
}

export async function activeController(request, response, next) {
  try {
    const rawTournamentId = request.query.tournamentId;
    let tournamentId;
    if (rawTournamentId !== undefined) {
      const parsed = Number(rawTournamentId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return response.json({ success: true, data: { announcements: [] } });
      }
      tournamentId = parsed;
    }
    return response.json({ success: true, data: { announcements: await getActiveAnnouncement(tournamentId) } });
  } catch (error) {
    return next(error);
  }
}

export async function deleteController(request, response, next) {
  try { await deleteAnnouncement(request.params.id); return response.status(204).send(); } catch (error) { return next(error); }
}
