import { createCommand } from "#base";
import { db } from "#database";
import { env } from "#env";
import { buildSettingsV2PanelReply, createBlacklistedEmbed, isBlacklisted } from "#functions";
import { ApplicationCommandType } from "discord.js";

createCommand({
    name: "painel",
    description: "Abre o painel de configuracao do bot",
    type: ApplicationCommandType.ChatInput,
    dmPermission: false,
    defaultMemberPermissions: ["ManageGuild"],
    async run(interaction) {
        const ownerId = env.OWNER_DISCORD_ID?.trim();
        if (!ownerId) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "OWNER_DISCORD_ID nao foi configurado no .env.",
            });
            return;
        }

        if (interaction.user.id !== ownerId) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Apenas o dono configurado pode acessar este painel.",
            });
            return;
        }

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
