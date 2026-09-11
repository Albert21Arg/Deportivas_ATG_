import { subscribe } from '../services/realtime-service.js';
export function streamController(request, response) { response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' }); const cleanup = subscribe(request.params.id, response); request.on('close', cleanup); }
