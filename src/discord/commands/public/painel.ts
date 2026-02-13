import { createCommand } from "#base";
import { db } from "#database";
import { buildSettingsV2PanelReply, createBlacklistedEmbed, isBlacklisted } from "#functions";
import { ApplicationCommandType } from "discord.js";

createCommand({
    name: "painel",
    description: "Abre o painel de configuracao do bot",
    type: ApplicationCommandType.ChatInput,
    dmPermission: false,
    defaultMemberPermissions: ["ManageGuild"],
    async run(interaction) {
        const [guildData, streamerConfig] = await Promise.all([
            db.guilds.get(interaction.guildId),
            db.streamerConfigs.get(interaction.guildId),
        ]);
        if (isBlacklisted(guildData, interaction.user.id)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createBlacklistedEmbed()],
            });
            return;
        }

        await interaction.reply(buildSettingsV2PanelReply(interaction.guild, guildData, streamerConfig));
    },
});
