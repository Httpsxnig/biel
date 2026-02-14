import type { StreamerConfigSchema } from "#database";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    EmbedBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    type APIEmbedField,
} from "discord.js";

export type StreamerRoleKey = "influencer" | "creator" | "tier1" | "tier2";
export type StreamerQuestionKey =
    | "requirementsRead"
    | "realName"
    | "age"
    | "platformLink"
    | "contentType"
    | "cityNameId"
    | "inGamePhone"
    | "rpActivity"
    | "proof";

export interface StreamerQuestion {
    key: StreamerQuestionKey;
    label: string;
    allowAttachment?: boolean;
}

export interface StreamerFormState {
    guildId: string;
    step: number;
    answers: Partial<Record<StreamerQuestionKey, string>>;
    attachments: string[];
}

export const streamerRoleLabels: Record<StreamerRoleKey, string> = {
    influencer: "ALTA - TIER 1 - INFLUENCER",
    creator: "ALTA - TIER 2 - CRIADOR DE CONTEUDO",
    tier1: "ALTA - TIER 3 - CCONTEUDO",
    tier2: "ALTA - TIER 4 STREAMER",
};

const streamerRoleEntries = Object.entries(streamerRoleLabels) as [StreamerRoleKey, string][];
const streamerPanelAccentColor = 0x790af7;

export const streamerQuestions: readonly StreamerQuestion[] = [
    { key: "requirementsRead", label: "Leu os requisitos? (SIM/NAO)" },
    { key: "realName", label: "Nome real" },
    { key: "age", label: "Idade real" },
    { key: "platformLink", label: "Link da plataforma (Twitch, YouTube, TikTok...)" },
    { key: "contentType", label: "Tipo de conteudo" },
    { key: "cityNameId", label: "Nome e ID da cidade ingame" },
    { key: "inGamePhone", label: "Numero ingame (telefone RP)" },
    { key: "rpActivity", label: "Atuacao (profissao ou funcao no RP)" },
    { key: "proof", label: "Envie um print do perfil/seguindo (somente imagem)", allowAttachment: true },
];

export const activeStreamerForms = new Map<string, StreamerFormState>();

export function createStreamerPanelMessage(guildId: string, guildName: string, config: Partial<StreamerConfigSchema>) {
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder({
            customId: `streamers/form/start/${guildId}`,
            style: ButtonStyle.Primary,
            label: "Comecar formulario",
        }),
        new ButtonBuilder({
            customId: `streamers/form/requirements/${guildId}`,
            style: ButtonStyle.Secondary,
            label: "Requisitos",
            disabled: !config.channels?.requirements,
        }),
        new ButtonBuilder({
            customId: `streamers/form/benefits/${guildId}`,
            style: ButtonStyle.Secondary,
            label: "Beneficios",
            disabled: !config.channels?.benefits,
        }),
    );

    const section = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# Formulario Streamer/Criador de Conteudo"),
            new TextDisplayBuilder().setContent(
                [
                    `> Servidor: **${guildName}**`,
                    "> Clique em **Comecar formulario** para responder no privado.",
                    "> Processo simplificado e rapido.",
                ].join("\n"),
            ),
        );

    const panelImageUrl = getValidImageUrl(config.panelImage);
    const footerText = config.footer?.trim() || "Sistema de Streamers";
    if (panelImageUrl) {
        section.setThumbnailAccessory(new ThumbnailBuilder().setURL(panelImageUrl));
    } else {
        section.setButtonAccessory(
            new ButtonBuilder()
                .setCustomId(`streamers/form/info/${guildId}`)
                .setLabel("Sem imagem")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
        );
    }

    const container = new ContainerBuilder()
        .setAccentColor(streamerPanelAccentColor)
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true),
        )
        .addSectionComponents(section)
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
            new TextDisplayBuilder().setContent(`-# ${footerText}`),
        );

    return {
        flags: ["IsComponentsV2"] as const,
        components: [container],
    };
}
export function createStreamerQuestionEmbed(state: StreamerFormState) {
    const question = streamerQuestions[state.step];
    const current = state.step + 1;
    const total = streamerQuestions.length;
    const attachmentHint = question.allowAttachment
        ? "\n\nEnvie uma imagem em anexo. Mensagem sem imagem nao sera aceita."
        : "";

    return new EmbedBuilder()
        .setColor("#a112cc")
        .setTitle("Formulario de Streamer")
        .setDescription(`**${current}/${total}** - ${question.label}${attachmentHint}`)
        .setFooter({ text: "Digite cancelar para parar o formulario." })
        .setTimestamp();
}

export function createStreamerSummaryEmbed(answers: Partial<Record<StreamerQuestionKey, string>>) {
    const fields: APIEmbedField[] = streamerQuestions.map((question) => ({
        name: question.label,
        value: truncateAnswer(answers[question.key] ?? "Nao informado"),
        inline: false,
    }));

    return new EmbedBuilder()
        .setColor("#22c55e")
        .setTitle("Revisao do formulario")
        .setDescription("Confira suas respostas e confirme o envio.")
        .addFields(fields)
        .setTimestamp();
}

export function createStreamerConfirmButtons(userId: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder({
            customId: `streamers/form/confirm/${userId}`,
            style: ButtonStyle.Success,
            label: "Enviar",
        }),
        new ButtonBuilder({
            customId: `streamers/form/cancel/${userId}`,
            style: ButtonStyle.Danger,
            label: "Cancelar",
        }),
    );
}

export function createStreamerRequestEmbed(
    user: { id: string; tag: string; displayAvatarURL(): string; toString(): string; },
    answers: Partial<Record<StreamerQuestionKey, string>>,
    attachments: string[],
    footer: string,
) {
    const fields: APIEmbedField[] = streamerQuestions.map((question) => ({
        name: question.label,
        value: truncateAnswer(answers[question.key] ?? "Nao informado"),
        inline: false,
    }));

    if (attachments.length > 0) {
        fields.push({
            name: "Anexos",
            value: truncateAnswer(attachments.join("\n")),
            inline: false,
        });
    }

    return new EmbedBuilder()
        .setColor("#ff0c03")
        .setTitle("Novo pedido de streamer")
        .setDescription(`Usuario: ${user.toString()} (\`${user.id}\`)`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(fields)
        .setFooter({ text: footer })
        .setTimestamp();
}

export function createStreamerReviewButtons(requestId: string, disabled = false) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder({
            customId: `streamers/review/approve/${requestId}`,
            style: ButtonStyle.Success,
            label: "Aceitar",
            disabled,
        }),
        new ButtonBuilder({
            customId: `streamers/review/deny/${requestId}`,
            style: ButtonStyle.Danger,
            label: "Negar",
            disabled,
        })
    );
}

export function createStreamerRoleSelect(requestId: string, config: Partial<StreamerConfigSchema>) {
    const options = streamerRoleEntries
        .filter(([key]) => !!config.roles?.[key])
        .map(([key, label]) => ({
            label,
            value: key,
        }));

    if (options.length === 0) {
        return null;
    }

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`streamers/review/role/${requestId}`)
            .setPlaceholder("Selecione o cargo para aprovacao")
            .addOptions(options)
            .setMinValues(1)
            .setMaxValues(1)
    );
}

export function createStreamerApprovedEmbed(roleLabel: string) {
    return new EmbedBuilder()
        .setColor("#22c55e")
        .setTitle("Pedido aprovado")
        .setDescription([
            "Seu formulario de streamer foi aprovado.",
            `Cargo: **${roleLabel}**`,
        ].join("\n"))
        .setTimestamp();
}

export function createStreamerRejectedEmbed() {
    return new EmbedBuilder()
        .setColor("#ef4444")
        .setTitle("Pedido negado")
        .setDescription("Seu formulario de streamer foi negado.")
        .setTimestamp();
}

function truncateAnswer(text: string) {
    if (text.length <= 1024) return text;
    return `${text.slice(0, 1021)}...`;
}

function getValidImageUrl(url?: string | null) {
    const value = url?.trim();
    if (!value) return null;
    try {
        return new URL(value).toString();
    } catch {
        return null;
    }
}
