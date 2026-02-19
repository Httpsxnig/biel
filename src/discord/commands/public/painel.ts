import { createCommand } from "#base";
import { db } from "#database";
import { env } from "#env";
import { buildSettingsV2PanelUpdate, createBlacklistedEmbed, isBlacklisted } from "#functions";
import { ApplicationCommandType } from "discord.js";

createCommand({
    name: "painel",
    description: "Abre o painel de configuracao do bot",
    type: ApplicationCommandType.ChatInput,
    dmPermission: false,
    async run(interaction) {
        await interaction.deferReply({ flags: ["Ephemeral"] }).catch(() => null);

        const ownerId = env.OWNER_DISCORD_ID?.trim();
        if (ownerId && interaction.user.id !== ownerId) {
            await interaction.editReply({
                content: "Apenas o dono configurado pode acessar este painel.",
            });
            return;
        }

        if (!ownerId && !interaction.memberPermissions?.has("ManageGuild")) {
            await interaction.editReply({
                content: "Voce precisa de Gerenciar Servidor para acessar o painel.",
            });
            return;
        }

        const [guildData, streamerConfig] = await Promise.all([
            db.guilds.get(interaction.guildId),
            db.streamerConfigs.get(interaction.guildId),
        ]);
        if (isBlacklisted(guildData, interaction.user.id)) {
            await interaction.editReply({
                embeds: [createBlacklistedEmbed()],
            });
            return;
        }

        await interaction.editReply(buildSettingsV2PanelUpdate(interaction.guild, guildData, streamerConfig));
    },
});
