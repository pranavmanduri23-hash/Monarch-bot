import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getInviteStats, getInvitedBy, getInviteLeaderboard } from '../../services/inviteService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Check invite stats')
    .addSubcommand(sub =>
      sub.setName('check')
        .setDescription('Check invite stats for a user')
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('User to check (defaults to you)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('leaderboard')
        .setDescription('Show the top inviters in this server')
    ),

  async execute(interaction, config, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();

    try {
      if (sub === 'leaderboard') {
        const lb = await getInviteLeaderboard(client, interaction.guildId);

        if (lb.length === 0) {
          return interaction.editReply({ content: '📭 No invite data yet!' });
        }

        const description = lb
          .map((e, i) => `**${i + 1}.** <@${e.userId}> — **${e.total}** invite(s)`)
          .join('\n');

        const embed = new EmbedBuilder()
          .setTitle(`📨 Invite Leaderboard — ${interaction.guild.name}`)
          .setDescription(description)
          .setColor(0x5865F2)
          .setTimestamp();

        return interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      // sub === 'check'
      const target = interaction.options.getUser('user') || interaction.user;
      const stats = await getInviteStats(client, interaction.guildId, target.id);
      const invitedById = await getInvitedBy(client, interaction.guildId, target.id);

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

      return interaction.editReply({ embeds: [embed] });

    } catch (error) {
      logger.error('Error in /invites command:', error);
      return interaction.editReply({ content: '❌ Something went wrong.' });
    }
  }
};
