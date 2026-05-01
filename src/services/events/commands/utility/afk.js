import { EmbedBuilder } from 'discord.js';
import { setAfk, isAfk } from '../../services/afkService.js';

export default {
  name: 'afk',
  description: 'Set your AFK status',
  aliases: ['away'],
  
  async execute(message, args) {
    const reason = args.join(' ') || 'AFK';
    const originalNick = message.member.nickname || message.author.username;

    if (isAfk(message.author.id)) {
      return message.reply('⚠️ You are already AFK!');
    }

    setAfk(message.author.id, reason, originalNick);

    // Try to prefix nickname with [AFK]
    try {
      await message.member.setNickname(`[AFK] ${originalNick}`.slice(0, 32));
    } catch (_) {}

    const embed = new EmbedBuilder()
      .setDescription(`✅ **${message.author.displayName}** is now AFK: *${reason}*`)
      .setColor(0xED4245);

    await message.channel.send({ embeds: [embed] });
  }
};
