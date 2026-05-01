// Stores AFK data in-memory (or swap with your DB if needed)
const afkMap = new Map(); // Map<userId, { reason, since, originalNick }>

export function setAfk(userId, reason, originalNick) {
  afkMap.set(userId, { reason, since: Date.now(), originalNick });
}

export function removeAfk(userId) {
  afkMap.delete(userId);
}

export function getAfk(userId) {
  return afkMap.get(userId) || null;
}

export function isAfk(userId) {
  return afkMap.has(userId);
}

export function getAfkDuration(userId) {
  const data = afkMap.get(userId);
  if (!data) return 0;
  return Math.floor((Date.now() - data.since) / 60000); // in minutes
}
