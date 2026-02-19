import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
} from "discord.js";

export const RO_PANEL_BUTTON_CUSTOM_ID = "provasro/panel/open";
export const RO_PANEL_BUTTON_LABEL = "Solicitar R.O em FAC";
export const RO_PANEL_TITLE = "# Solicitacao de R.O em FAC";
export const RO_PANEL_DESCRIPTION = "Clique no botao abaixo para iniciar sua solicitacao de R.O.";
export const RO_PANEL_FOOTER = "-# (©) Direitos reservados da Lotus Group";

export function createRoPanelPayloadV2() {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(RO_PANEL_BUTTON_CUSTOM_ID)
            .setStyle(ButtonStyle.Primary)
            .setLabel(RO_PANEL_BUTTON_LABEL),
    );

    const container = new ContainerBuilder()
        .setAccentColor(0x2563eb)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(RO_PANEL_TITLE),
            new TextDisplayBuilder().setContent(RO_PANEL_DESCRIPTION),
        )
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true),
        )
        .addActionRowComponents(row)
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(RO_PANEL_FOOTER),
        );

    return {
        flags: ["IsComponentsV2"] as const,
        components: [container],
    };
}

export function isRoPanelMessage(
    message: { author: { id: string; }; components: unknown[]; },
    botId: string,
) {
    if (message.author.id !== botId) return false;
    return message.components.some((component) => hasCustomIdRecursive(component, RO_PANEL_BUTTON_CUSTOM_ID));
}

function hasCustomIdRecursive(component: unknown, targetCustomId: string): boolean {
    if (!component || typeof component !== "object") return false;

    const data = component as { customId?: string | null; components?: unknown[]; };
    if (data.customId === targetCustomId) return true;
    if (!Array.isArray(data.components)) return false;

    return data.components.some((child) => hasCustomIdRecursive(child, targetCustomId));
}
