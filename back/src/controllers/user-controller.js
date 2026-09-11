import { createAdmin, listAdmins, updateAdmin } from '../services/user-service.js';

export async function listController(_request, response, next) {
  try {
    const users = await listAdmins();
    return response.json({ success: true, data: { users } });
  } catch (error) {
    return next(error);
  }
}

export async function createController(request, response, next) {
  try {
    const user = await createAdmin(request.validatedBody);
    return response.status(201).json({ success: true, data: { user } });
  } catch (error) {
    return next(error);
  }
}

export async function updateController(request, response, next) {
  try {
    const user = await updateAdmin(request.userId, request.validatedBody);
    return response.json({ success: true, data: { user } });
  } catch (error) {
    return next(error);
  }
}
