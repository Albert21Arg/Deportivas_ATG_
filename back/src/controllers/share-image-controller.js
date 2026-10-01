import { fetchRegisteredShareImage } from '../services/share-image-service.js';

export async function shareImageController(request, response, next) {
  try {
    const { contentType, body } = await fetchRegisteredShareImage(request.query.url);
    response.set({
      'Cache-Control': 'private, max-age=300',
      'Content-Length': String(body.length),
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
    });
    return response.send(body);
  } catch (error) {
    return next(error);
  }
}
