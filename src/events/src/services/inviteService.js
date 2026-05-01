// Stores invite snapshots per guild
// Map<guildId, Map<inviteCode, { uses, inviterId }>>
const inviteCache = new Map();

// Map<guildId, Map<inviterId, { total, invitees: [userId] }>>
const inviteStats = new Map();

// ── Cache all invites for a guild ──
export async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map();
    invites.forEach(invite => {
      map.set(invite.code, {
        uses: invite.uses,
        inviterId: invite.inviter?.id || null,
        inviterTag: invite.inviter?.tag || 'Unknown',
      });
    });
    inviteCache.set(guild.id, map);
  } catch (_) {}
}

// ── Find who invited a new member by comparing invite uses ──
export async function findInviter(guild) {
  const cachedInvites = inviteCache.get(guild.id) || new Map();

  try {
    const freshInvites = await guild.invites.fetch();
    let usedInvite = null;

    freshInvites.forEach(invite => {
      const cached = cachedInvites.get(invite.code);
      if (cached && invite.uses > cached.uses) {
        usedInvite = invite;
      }
    });

    // Update cache with fresh data
    const newMap = new Map();
    freshInvites.forEach(invite => {
      newMap.set(invite.code, {
        uses: invite.uses,
        inviterId: invite.inviter?.id || null,
        inviterTag: invite.inviter?.tag || 'Unknown',
      });
    });
    inviteCache.set(guild.id, newMap);

    return usedInvite
      ? { inviterId: usedInvite.inviter?.id, inviterTag: usedInvite.inviter?.tag, code: usedInvite.code }
      : null;
  } catch (_) {
    return null;
  }
}

// ── Record who invited who ──
export function recordInvite(guildId, inviterId, inviteeId) {
  if (!inviteStats.has(guildId)) {
    inviteStats.set(guildId, new Map());
  }

  const guildStats = inviteStats.get(guildId);

  if (!guildStats.has(inviterId)) {
    guildStats.set(inviterId, { total: 0, invitees: [] });
  }

  const stats = guildStats.get(inviterId);
  stats.total += 1;
  stats.invitees.push(inviteeId);
}

// ── Get invite stats for a user ──
export function getInviteStats(guildId, userId) {
  const guildStats = inviteStats.get(guildId);
  if (!guildStats) return { total: 0, invitees: [] };
  return guildStats.get(userId) || { total: 0, invitees: [] };
}

// ── Get who invited a specific user ──
export function getInvitedBy(guildId, userId) {
  const guildStats = inviteStats.get(guildId);
  if (!guildStats) return null;

  for (const [inviterId, data] of guildStats) {
    if (data.invitees.includes(userId)) {
      return inviterId;
    }
  }
  return null;
}

// ── Get leaderboard for a guild ──
export function getInviteLeaderboard(guildId, limit = 10) {
  const guildStats = inviteStats.get(guildId);
  if (!guildStats) return [];

  return [...guildStats.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit)
    .map(([userId, data]) => ({ userId, total: data.total, invitees: data.invitees }));
}
