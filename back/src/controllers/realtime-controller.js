import { subscribe } from '../services/realtime-service.js';
// X-Accel-Buffering: no evita que un proxy intermedio (túnel/worker) guarde
// en buffer la respuesta en vez de irla entregando al vuelo, que es lo que
// necesita un stream de eventos para sentirse "en vivo".
export function streamController(request, response) { response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' }); if (typeof response.flushHeaders === 'function') response.flushHeaders(); const cleanup = subscribe(request.params.id, response); request.on('close', cleanup); }
