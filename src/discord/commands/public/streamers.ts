import { createCommand } from "#base";
import { db } from "#database";
import {
    createBlacklistedEmbed,
    createNoticeEmbed,
    createStreamerPanelMessage,
    isBlacklisted,
    isStreamerPanelMessage,
} from "#functions";
import { ApplicationCommandType } from "discord.js";

const streamers = createCommand({
    name: "streamers",
    description: "Sistema simplificado de formulario para streamers",
    type: ApplicationCommandType.ChatInput,
    dmPermission: false,
    defaultMemberPermissions: ["ManageGuild"],
    async run(interaction) {
        const guildData = await db.guilds.get(interaction.guildId);
        if (isBlacklisted(guildData, interaction.user.id)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createBlacklistedEmbed()],
            });
            this.block();
        }

        const config = await db.streamerConfigs.get(interaction.guildId);
        return { config };
    },
});

streamers.subcommand({
    name: "painel",
    description: "Posta o painel com botoes de formulario",
    async run(interaction, { config }) {
        const channel = interaction.channel;
        if (!channel || !channel.isTextBased() || !("messages" in channel)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("error", "Canal invalido", "Este canal nao aceita mensagens de texto.")],
            });
            return;
        }

        const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
        const existingPanels = [...(messages?.values() ?? [])].filter((message) =>
            isStreamerPanelMessage(message, interaction.client.user.id, interaction.guildId),
        );
        if (existingPanels.length) {
            await Promise.allSettled(existingPanels.map((message) => message.delete().catch(() => null)));
        }

        const payload = createStreamerPanelMessage(interaction.guildId, interaction.guild.name, config);
        await interaction.reply(payload);
    },
});
