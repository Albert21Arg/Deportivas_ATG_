import { getSiteSettings, updateSiteSettings } from '../services/site-setting-service.js';

export async function activeController(_request, response, next) {
  try {
    return response.json({ success: true, data: { settings: await getSiteSettings() } });
  } catch (error) {
    return next(error);
  }
}

export async function updateController(request, response, next) {
  try {
    const settings = await updateSiteSettings(request.validatedBody);
    return response.json({ success: true, data: { settings } });
  } catch (error) {
    return next(error);
  }
}
