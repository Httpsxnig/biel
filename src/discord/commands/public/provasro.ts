import { createCommand } from "#base";
import { db } from "#database";
import { createBlacklistedEmbed, createNoticeEmbed, createRoPanelPayloadV2, isBlacklisted, isRoPanelMessage } from "#functions";
import { ApplicationCommandType } from "discord.js";

createCommand({
    name: "provasro",
    description: "Publica ou atualiza o painel de Solicitacao de R.O em FAC",
    type: ApplicationCommandType.ChatInput,
    dmPermission: false,
    defaultMemberPermissions: ["ManageGuild"],
    async run(interaction) {
        await interaction.deferReply({ flags: ["Ephemeral"] }).catch(() => null);

        const guildData = await db.guilds.get(interaction.guildId);
        if (isBlacklisted(guildData, interaction.user.id)) {
            await interaction.editReply({
                embeds: [createBlacklistedEmbed()],
            });
            return;
        }

        const panelChannelId = guildData.channels?.roPanel?.trim();
        if (!panelChannelId) {
            await interaction.editReply({
                embeds: [
                    createNoticeEmbed(
                        "error",
                        "Canal do painel nao configurado",
                        "Defina `R.O: Canal do painel` no /painel de configuracao.",
                    ),
                ],
            });
            return;
        }

        const channel = await interaction.client.channels.fetch(panelChannelId).catch(() => null);
        if (!channel || !channel.isTextBased() || !("send" in channel) || !("messages" in channel)) {
            await interaction.editReply({
                embeds: [createNoticeEmbed("error", "Canal invalido", "O canal configurado nao aceita mensagens de texto.")],
            });
            return;
        }

        const payload = createRoPanelPayloadV2();
        const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
        const existingPanels = [...(messages?.values() ?? [])].filter((message) =>
            isRoPanelMessage(message, interaction.client.user.id),
        );
        if (existingPanels.length) {
            await Promise.allSettled(existingPanels.map((message) => message.delete().catch(() => null)));
        }

        const sent = await channel.send(payload).catch(() => null);
        if (!sent) {
            await interaction.editReply({
                embeds: [createNoticeEmbed("error", "Falha ao publicar", "Nao consegui enviar o painel no canal informado.")],
            });
            return;
        }
        const panelMessageUrl = sent.url;

        await interaction.editReply({
            embeds: [
                createNoticeEmbed(
                    "success",
                    "Painel R.O reiniciado",
                    [
                        `Canal: <#${panelChannelId}>`,
                        panelMessageUrl ? `[Abrir painel](${panelMessageUrl})` : null,
                    ].filter(Boolean).join("\n"),
                ),
            ],
        });
    },
});

