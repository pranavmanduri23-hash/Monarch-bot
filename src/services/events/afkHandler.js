import { Events, EmbedBuilder } from 'discord.js';
import { isAfk, getAfk, removeAfk, getAfkDuration } from '../services/afkService.js';

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot) return;

    const userId = message.author.id;
    const prefix = client.config.bot.prefix || '!';

    // ── 1. User is AFK and sends a message → remove AFK ──
    if (isAfk(userId)) {
      // Don't remove if they're running !afk again
      if (message.content.toLowerCase().startsWith(`${prefix}afk`)) return;

      const { originalNick } = getAfk(userId);
      const minutes = getAfkDuration(userId);
      removeAfk(userId);

      const embed = new EmbedBuilder()
        .setDescription(`👋 Welcome back, **${message.author.displayName}**! You were AFK for **${minutes} minute(s)**.`)
        .setColor(0x57F287);

      const msg = await message.channel.send({ embeds: [embed] });
      setTimeout(() => msg.delete().catch(() => {}), 8000);

      // Restore nickname
      try {
        await message.member.setNickname(originalNick || null);
      } catch (_) {}
    }

    // ── 2. Someone mentions an AFK user ──
    for (const [, mentioned] of message.mentions.users) {
      if (mentioned.id === message.author.id) continue; // ignore self-mentions
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
};
