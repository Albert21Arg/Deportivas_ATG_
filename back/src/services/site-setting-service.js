import * as repository from '../repositories/site-setting-repository.js';

export async function getSiteSettings() {
  const settings = await repository.findSettings();
  return { faviconUrl: settings?.faviconUrl ?? null };
}

export async function updateSiteSettings(data) {
  const settings = await repository.upsertSettings(data);
  return { faviconUrl: settings.faviconUrl ?? null };
}
