import { logger } from '../utils/logger.js';

// In-memory cache of invite snapshots per guild
// Map<guildId, Map<inviteCode, { uses, inviterId, inviterTag }>>
const inviteCache = new Map();

// ── Cache all current invites for a guild ──
export async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map();
    invites.forEach(invite => {
      map.set(invite.code, {
        uses: invite.uses ?? 0,
        inviterId: invite.inviter?.id || null,
        inviterTag: invite.inviter?.username || 'Unknown',
      });
    });
    inviteCache.set(guild.id, map);
  } catch (error) {
    logger.warn(`Could not cache invites for guild ${guild.name}: ${error.message}`);
  }
}

// ── Compare old vs new invites to find which one was used ──
export async function findInviter(guild) {
  const cachedInvites = inviteCache.get(guild.id) || new Map();

  try {
    const freshInvites = await guild.invites.fetch();
    let usedInvite = null;

    freshInvites.forEach(invite => {
      const cached = cachedInvites.get(invite.code);
      if (cached && (invite.uses ?? 0) > cached.uses) {
        usedInvite = invite;
      }
    });

    // Update cache with latest data
    const newMap = new Map();
    freshInvites.forEach(invite => {
      newMap.set(invite.code, {
        uses: invite.uses ?? 0,
        inviterId: invite.inviter?.id || null,
        inviterTag: invite.inviter?.username || 'Unknown',
      });
    });
    inviteCache.set(guild.id, newMap);

    return usedInvite
      ? {
          inviterId: usedInvite.inviter?.id || null,
          inviterTag: usedInvite.inviter?.username || 'Unknown',
          code: usedInvite.code,
        }
      : null;
  } catch (error) {
    logger.warn(`Could not fetch invites for guild ${guild.name}: ${error.message}`);
    return null;
  }
}

// ── DB key helpers ──
const statsKey = (guildId) => `invites:stats:${guildId}`;
const invitedByKey = (guildId) => `invites:invitedby:${guildId}`;

// ── Record an invite in DB ──
export async function recordInvite(client, guildId, inviterId, inviteeId) {
  try {
    // Update inviter's stats
    const stats = (await client.db.get(statsKey(guildId))) || {};
    if (!stats[inviterId]) {
      stats[inviterId] = { total: 0, invitees: [] };
    }
    stats[inviterId].total += 1;
    if (!stats[inviterId].invitees.includes(inviteeId)) {
      stats[inviterId].invitees.push(inviteeId);
    }
    await client.db.set(statsKey(guildId), stats);

    // Record who invited this user
    const invitedBy = (await client.db.get(invitedByKey(guildId))) || {};
    invitedBy[inviteeId] = inviterId;
    await client.db.set(invitedByKey(guildId), invitedBy);
  } catch (error) {
    logger.error(`Error recording invite in guild ${guildId}:`, error);
  }
}

// ── Get stats for a specific user ──
export async function getInviteStats(client, guildId, userId) {
  try {
    const stats = (await client.db.get(statsKey(guildId))) || {};
    return stats[userId] || { total: 0, invitees: [] };
  } catch (error) {
    logger.error(`Error getting invite stats:`, error);
    return { total: 0, invitees: [] };
  }
}

// ── Get who invited a specific user ──
export async function getInvitedBy(client, guildId, userId) {
  try {
    const invitedBy = (await client.db.get(invitedByKey(guildId))) || {};
    return invitedBy[userId] || null;
  } catch (error) {
    logger.error(`Error getting invitedBy:`, error);
    return null;
  }
}

// ── Get leaderboard for a guild ──
export async function getInviteLeaderboard(client, guildId, limit = 10) {
  try {
    const stats = (await client.db.get(statsKey(guildId))) || {};
    return Object.entries(stats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, limit)
      .map(([userId, data]) => ({ userId, total: data.total, invitees: data.invitees }));
  } catch (error) {
    logger.error(`Error getting invite leaderboard:`, error);
    return [];
  }
}
