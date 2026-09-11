import { listActiveFloatingBubbles, listFloatingBubbles, updateFloatingBubble } from '../services/floating-bubble-service.js';

export async function listController(_request, response, next) {
  try {
    return response.json({ success: true, data: { bubbles: await listFloatingBubbles() } });
  } catch (error) {
    return next(error);
  }
}

export async function activeController(_request, response, next) {
  try {
    return response.json({ success: true, data: { bubbles: await listActiveFloatingBubbles() } });
  } catch (error) {
    return next(error);
  }
}

export async function updateController(request, response, next) {
  try {
    const bubble = await updateFloatingBubble(request.params.id, request.validatedBody);
    return response.json({ success: true, data: { bubble } });
  } catch (error) {
    return next(error);
  }
}
