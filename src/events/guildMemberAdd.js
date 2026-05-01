import { Events, EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { findInviter, recordInvite, cacheGuildInvites } from '../services/inviteService.js';

export default {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    try {
      const guild = member.guild;
      const inviteData = await findInviter(guild);

      if (inviteData?.inviterId) {
        await recordInvite(client, guild.id, inviteData.inviterId, member.id);
        logger.info(
          `${member.user.username} joined ${guild.name} — invited by ${inviteData.inviterTag} (code: ${inviteData.code})`
        );
      } else {
        logger.info(`${member.user.username} joined ${guild.name} — invite could not be determined`);
      }

    } catch (error) {
      logger.error('Error in guildMemberAdd invite tracking:', error);
    }
  }
};
