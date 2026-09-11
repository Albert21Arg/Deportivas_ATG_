const clients = new Map();

export function subscribe(tournamentId, response) {
  const key = String(tournamentId);
  const set = clients.get(key) ?? new Set();
  set.add(response); clients.set(key, set);
  response.write('event: connected\ndata: {}\n\n');
  return () => { set.delete(response); if (!set.size) clients.delete(key); };
}

export function publish(tournamentId, payload) {
  for (const response of clients.get(String(tournamentId)) ?? []) response.write(`event: match.updated\ndata: ${JSON.stringify(payload)}\n\n`);
}
