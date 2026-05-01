import { getInviteStats, getInvitedBy, getInviteLeaderboard } from '../services/inviteService.js';

// In execute():
await handleInvites(message, client); // ← add after handleAfk

// ── New function ──
async function handleInvites(message, client) {
  const prefix = client.config.bot.prefix || '!';
  if (!message.content.toLowerCase().startsWith(`${prefix}invites`)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  args.shift(); // remove 'invites'
  const sub = args[0]?.toLowerCase();

  // !invites leaderboard
  if (sub === 'leaderboard' || sub === 'lb') {
    const lb = await getInviteLeaderboard(client, message.guild.id);

    if (lb.length === 0) return message.reply('📭 No invite data yet!');

    const description = lb
      .map((e, i) => `**${i + 1}.** <@${e.userId}> — **${e.total}** invite(s)`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle(`📨 Invite Leaderboard — ${message.guild.name}`)
      .setDescription(description)
      .setColor(0x5865F2)
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }

  // !invites or !invites @user
  const target = message.mentions.users.first() || message.author;
  const stats = await getInviteStats(client, message.guild.id, target.id);
  const invitedById = await getInvitedBy(client, message.guild.id, target.id);

  const inviteeList = stats.invitees.length > 0
    ? stats.invitees.slice(0, 10).map(id => `<@${id}>`).join(', ')
    : 'None';

  const embed = new EmbedBuilder()
    .setTitle(`📨 Invite Stats — ${target.username}`)
    .addFields(
      { name: '✅ Total Invites', value: `**${stats.total}**`, inline: true },
      { name: '📥 Invited By', value: invitedById ? `<@${invitedById}>` : 'Unknown', inline: true },
      { name: '👥 People Invited', value: inviteeList }
    )
    .setColor(0x5865F2)
    .setThumbnail(target.displayAvatarURL())
    .setTimestamp();

  return message.channel.send({ embeds: [embed] });
}




import { Events, EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getLevelingConfig, getUserLevelData } from '../services/leveling.js';
import { addXp } from '../services/xpSystem.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { isAfk, getAfk, removeAfk, getAfkDuration, setAfk } from '../services/afkService.js';

const MESSAGE_XP_RATE_LIMIT_ATTEMPTS = 12;
const MESSAGE_XP_RATE_LIMIT_WINDOW_MS = 10000;

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      if (message.author.bot || !message.guild) return;

      await handleAfk(message, client);  // ← ADD THIS
      await handleLeveling(message, client);
    } catch (error) {
      logger.error('Error in messageCreate event:', error);
    }
  }
};

// ── AFK Handler ──────────────────────────────────────────
async function handleAfk(message, client) {
  const userId = message.author.id;
  const prefix = client.config.bot.prefix || '!';
  const content = message.content.toLowerCase();

  // ── Handle !afk command ──
  if (content.startsWith(`${prefix}afk`)) {
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    args.shift(); // remove 'afk'
    const reason = args.join(' ') || 'AFK';
    const originalNick = message.member.nickname || message.author.username;

    if (isAfk(userId)) {
      return message.reply('⚠️ You are already AFK!');
    }

    setAfk(userId, reason, originalNick);

    try {
      await message.member.setNickname(`[AFK] ${originalNick}`.slice(0, 32));
    } catch (_) {}

    const embed = new EmbedBuilder()
      .setDescription(`✅ **${message.author.displayName}** is now AFK: *${reason}*`)
      .setColor(0xED4245);

    return message.channel.send({ embeds: [embed] });
  }

  // ── Remove AFK when AFK user sends a message ──
  if (isAfk(userId)) {
    const { originalNick } = getAfk(userId);
    const minutes = getAfkDuration(userId);
    removeAfk(userId);

    const embed = new EmbedBuilder()
      .setDescription(`👋 Welcome back, **${message.author.displayName}**! You were AFK for **${minutes} minute(s)**.`)
      .setColor(0x57F287);

    const msg = await message.channel.send({ embeds: [embed] });
    setTimeout(() => msg.delete().catch(() => {}), 8000);

    try {
      await message.member.setNickname(originalNick || null);
    } catch (_) {}
  }

  // ── Notify if someone mentions an AFK user ──
  for (const [, mentioned] of message.mentions.users) {
    if (mentioned.id === userId) continue; // skip self-mentions
    if (isAfk(mentioned.id)) {
      const { reason } = getAfk(mentioned.id);
      const minutes = getAfkDuration(mentioned.id);

      const embed = new EmbedBuilder()
        .setDescription(
          `💤 **${mentioned.displayName}** is currently AFK: *${reason}*\n` +
          `⏱️ AFK for **${minutes} minute(s)**`
        )
        .setColor(0xFEE75C);

      await message.channel.send({ embeds: [embed] });
    }
  }
}

// ── Leveling Handler (unchanged) ─────────────────────────
async function handleLeveling(message, client) {
  // ... your existing leveling code, no changes needed
}
