import { fetchRegisteredWorkerImage } from '../services/worker-share-image-service.js';

export async function workerShareImageController(request, response, next) {
  try {
    const { contentType, body } = await fetchRegisteredWorkerImage(request.query.url);
    response.set({
      'Cache-Control': 'private, max-age=300',
      'Content-Length': String(body.byteLength),
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
    });
    return response.send(body);
  } catch (error) {
    return next(error);
  }
}
