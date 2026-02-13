import { createCommand } from "#base";
import { db } from "#database";
import { createBlacklistedEmbed, createNoticeEmbed, isBlacklisted } from "#functions";
import { createDate, createRow } from "@magicyan/discord";
import { ApplicationCommandType, ButtonBuilder, ButtonStyle } from "discord.js";

createCommand({
    name: "ping",
    description: "Mostra a latencia atual do bot",
    type: ApplicationCommandType.ChatInput,
    async run(interaction) {
        const guildData = await db.guilds.get(interaction.guildId);
        if (isBlacklisted(guildData, interaction.user.id)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createBlacklistedEmbed()],
            });
            return;
        }

        const now = createDate();
        const localPing = Date.now() - interaction.createdTimestamp;
        const apiPing = interaction.client.ws.ping;

        const row = createRow(
            new ButtonBuilder({
                customId: `remind/${now.toISOString()}`,
                style: ButtonStyle.Secondary,
                label: "Quando rodei esse teste?",
            })
        );

        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [
                createNoticeEmbed(
                    "success",
                    "Latencia",
                    [
                        `Latencia local: \`${localPing}ms\``,
                        `Latencia da API: \`${apiPing}ms\``,
                    ].join("\n")
                )
            ],
            components: [row],
        });
    }
});
