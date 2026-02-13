import { createCommand, createResponder } from "#base";
import { db } from "#database";
import { isBlacklisted } from "#functions";
import { ResponderType } from "@constatic/base";
import { createContainer, createSection, Separator } from "@magicyan/discord";
import { ApplicationCommandType, ButtonBuilder, ButtonStyle, InteractionReplyOptions } from "discord.js";

createCommand({
    name: "counter",
    description: "Counter command",
    type: ApplicationCommandType.ChatInput,
    async run(interaction) {
        const guildData = await db.guilds.get(interaction.guildId);
        if (isBlacklisted(guildData, interaction.user.id)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Voce esta na blacklist deste servidor e nao pode usar comandos.",
            });
            return;
        }

        await interaction.reply(counterMenu(0));
    }
});

createResponder({
    customId: "counter/:current",
    types: [ResponderType.Button],
    cache: "cached",
    parse: params => ({
        current: Number.parseInt(params.current)
    }),
    async run(interaction, { current }) {
        const guildData = await db.guilds.get(interaction.guildId);
        if (isBlacklisted(guildData, interaction.user.id)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Voce esta na blacklist deste servidor e nao pode usar comandos.",
            });
            return;
        }

        await interaction.update(
            counterMenu(current)
        );
    },
});

function counterMenu<R>(current: number): R {
    const container = createContainer("Random",
        createSection(
            `## Current value: \` ${current} \``,
            new ButtonBuilder({
                customId: "counter/00",
                label: "Reset",
                disabled: current === 0,
                style:
                    current > 0 ? ButtonStyle.Primary :
                        current < 0 ? ButtonStyle.Danger :
                            ButtonStyle.Secondary
            }),
        ),
        Separator.Default,
        createSection(
            "Increment value",
            new ButtonBuilder({
                customId: `counter/${current + 1}`,
                label: "+",
                style: ButtonStyle.Success
            }),
        ),
        createSection(
            "Decrement value",
            new ButtonBuilder({
                customId: `counter/${current - 1}`,
                label: "-",
                style: ButtonStyle.Danger
            }),
        ),
    );

    return ({
        flags: ["Ephemeral", "IsComponentsV2"],
        components: [container]
    } satisfies InteractionReplyOptions) as R;
}
