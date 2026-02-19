import { createEvent, createResponder } from "#base";
import { db } from "#database";
import { createRoPanelPayloadV2, isRoPanelMessage, RO_PANEL_BUTTON_CUSTOM_ID } from "#functions";
import { ResponderType } from "@constatic/base";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    EmbedBuilder,
    ModalBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    TextInputBuilder,
    TextInputStyle,
    type ButtonInteraction,
    type Client,
    type Guild,
    type GuildMember,
} from "discord.js";

const OPEN_UPLOAD_BUTTON_CUSTOM_ID = "provasro/upload/open/:guildId/:userId";
const MODAL_INFO_CUSTOM_ID = "provasro/modal/info";
const MODAL_UPLOAD_CUSTOM_ID = "provasro/modal/upload";
const REVIEW_APPROVE_CUSTOM_ID = "provasro/review/approve";
const REVIEW_REJECT_CUSTOM_ID = "provasro/review/reject";

const FIELD_ORG_PM_ID = "org_pm";
const FIELD_FAC_ID = "fac";
const FIELD_MOTIVO_ID = "motivo";
const FIELD_PROOF_LINK_ID = "proof_link";

const RO_PENDING_TTL_MS = 10 * 60 * 1000;
const RO_STORAGE_RETENTION_DAYS = 15;
const RO_STORAGE_CLEANUP_INTERVAL_MS = RO_STORAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const RO_NOTIFY_MESSAGE_TITLE = "🔔 # Nova Solicitação: R.O";
const RO_NOTIFY_MESSAGE_INTRO = " - Uma nova solicitação de R.O foi criada no servidor.";
export const RO_NOTIFY_MESSAGE_TEMPLATE = [
    " - ``👤 Autor:`` {autor}",
    "",
    "- ``ORG PM solicitante:`` {org_pm}",
    "",
    " - ``FAC:`` {fac}",
    "",
    " - **Motivo:** {motivo}",
    "",
    "-# Data: {data}",
].join("\n");
const RO_NOTIFY_MESSAGE_FOOTER =
    "-# Você recebeu esta notificação pois você tem um cargo de notificação configurado no painel de R.O. Para evitar receber essas notificações, remova o cargo de notificação ou peça para um administrador remover por você.";


interface PendingRoRequest {
    guildId: string;
    userId: string;
    orgPm: string;
    fac: string;
    motivo: string;
    createdAt: number;
}

type RoDecision = "approved" | "rejected";

const pendingRoRequests = new Map<string, PendingRoRequest>();
let roStorageCleanupInterval: NodeJS.Timeout | null = null;

createEvent({
    name: "R.O FAC panel bootstrap",
    event: "ready",
    async run(client) {
        await ensureRoPanelMessages(client);
        await cleanupRoLegacyFields();
        await cleanupOldRoStorage();

        if (!roStorageCleanupInterval) {
            roStorageCleanupInterval = setInterval(() => {
                void cleanupOldRoStorage();
            }, RO_STORAGE_CLEANUP_INTERVAL_MS);
            roStorageCleanupInterval.unref?.();
        }
    },
});

createResponder({
    customId: RO_PANEL_BUTTON_CUSTOM_ID,
    types: [ResponderType.Button],
    async run(interaction) {
        await interaction.showModal(buildInfoModal());
    },
});

createResponder({
    customId: MODAL_INFO_CUSTOM_ID,
    types: [ResponderType.Modal, ResponderType.ModalComponent],
    async run(interaction) {
        try {
            if (!interaction.guildId) {
                await interaction.reply({
                    flags: ["Ephemeral"],
                    embeds: [buildErrorEmbed("Este formulario so pode ser usado dentro de servidor.")],
                });
                return;
            }

            const orgPm = normalizeInput(interaction.fields.getTextInputValue(FIELD_ORG_PM_ID), 70);
            const fac = normalizeInput(interaction.fields.getTextInputValue(FIELD_FAC_ID), 70);
            const motivo = normalizeInput(interaction.fields.getTextInputValue(FIELD_MOTIVO_ID), 700);

            if (!orgPm || !fac || !motivo) {
                await interaction.reply({
                    flags: ["Ephemeral"],
                    embeds: [buildErrorEmbed("ORG PM solicitante, FAC e MOTIVO são obrigatorios.")],
                });
                return;
            }

            const key = makePendingKey(interaction.guildId, interaction.user.id);
            sweepExpiredPendingRequests();
            pendingRoRequests.set(key, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                orgPm,
                fac,
                motivo,
                createdAt: Date.now(),
            });

            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [buildFormReceivedEmbed(orgPm, fac)],
                components: [buildOpenUploadButtonRow(interaction.guildId, interaction.user.id)],
            });
        } catch (error) {
            console.error("[provasro/modal/info] erro ao processar modal:", error);
            if (!interaction.deferred && !interaction.replied) {
                await interaction.reply({
                    flags: ["Ephemeral"],
                    content: "Falha ao processar formulario. Tente novamente.",
                }).catch(() => null);
            }
        }
    },
});

createResponder({
    customId: OPEN_UPLOAD_BUTTON_CUSTOM_ID,
    types: [ResponderType.Button],
    parse: (params) => ({ guildId: params.guildId, userId: params.userId }),
    async run(interaction, { guildId, userId }) {
        if (interaction.user.id !== userId) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [buildErrorEmbed("Apenas quem iniciou a solicitacao pode enviar a prova.")],
            });
            return;
        }

        if (interaction.guildId !== guildId) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [buildErrorEmbed("Este botao pertence a outro servidor.")],
            });
            return;
        }

        const pending = getPendingRequest(makePendingKey(guildId, userId));
        if (!pending) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [buildErrorEmbed("Sua solicitação expirou. Clique no painel é começe novamente.")],
            });
            return;
        }

        await interaction.showModal(buildUploadModal());
    },
});

createResponder({
    customId: MODAL_UPLOAD_CUSTOM_ID,
    types: [ResponderType.Modal, ResponderType.ModalComponent],
    async run(interaction) {
        await interaction.deferReply({ flags: ["Ephemeral"] }).catch(() => null);

        if (!interaction.guild || !interaction.guildId) {
            await interaction.editReply({
                embeds: [buildErrorEmbed("Contexto inválido para envio da solicitação.")],
            });
            return;
        }

        const pendingKey = makePendingKey(interaction.guildId, interaction.user.id);
        const pending = getPendingRequest(pendingKey);
        if (!pending) {
            await interaction.editReply({
                embeds: [buildErrorEmbed("Sua solicitação expirou. Clique no botão é tente novamente.")],
            });
            return;
        }

        const clipUrl = normalizeClipUrl(interaction.fields.getTextInputValue(FIELD_PROOF_LINK_ID));
        if (!clipUrl) {
            await interaction.editReply({
                embeds: [buildErrorEmbed("Link invalido. Envie uma URL valida (http/https).")],
                components: [buildOpenUploadButtonRow(interaction.guildId, interaction.user.id)],
            });
            return;
        }

        const guildData = await db.guilds.get(interaction.guildId);
        const analysisChannelId = guildData.channels?.roAnalysis?.trim();
        if (!analysisChannelId) {
            pendingRoRequests.delete(pendingKey);
            await interaction.editReply({
                embeds: [buildErrorEmbed("Configure `R.O: Canal de analise` no /painel antes de usar este formulário.")],
            });
            return;
        }

        const analysisChannel = await interaction.client.channels.fetch(analysisChannelId).catch(() => null);
        if (!analysisChannel || !analysisChannel.isTextBased() || !("send" in analysisChannel)) {
            pendingRoRequests.delete(pendingKey);
            await interaction.editReply({
                embeds: [buildErrorEmbed("Canal de analise invalido ou inacessivel.")],
            });
            return;
        }

        const me = interaction.guild.members.me ?? await interaction.guild.members.fetchMe().catch(() => null);
        if (!me) {
            pendingRoRequests.delete(pendingKey);
            await interaction.editReply({
                embeds: [buildErrorEmbed("Nao consegui validar as permissoes do bot no canal de analise.")],
            });
            return;
        }

        if ("permissionsFor" in analysisChannel) {
            const perms = analysisChannel.permissionsFor(me);
            const hasRequiredPerms = perms?.has(["ViewChannel", "SendMessages", "EmbedLinks", "AttachFiles"]);
            if (!hasRequiredPerms) {
                pendingRoRequests.delete(pendingKey);
                await interaction.editReply({
                    embeds: [
                        buildErrorEmbed(
                            "Sem permissao no canal de analise. Necessario: Ver Canal, Enviar Mensagens, Incorporar Links e Anexar Arquivos.",
                        ),
                    ],
                });
                return;
            }
        }

        const now = new Date();
        const requestEmbed = buildAnalysisRequestEmbed({
            requester: interaction.user,
            orgPm: pending.orgPm,
            fac: pending.fac,
            motivo: pending.motivo,
            clipUrl,
            at: now,
        });

        let sendError: unknown = null;
        const requestMessage = await analysisChannel.send({
            embeds: [requestEmbed],
            components: [buildReviewButtons(false)],
        }).catch((error) => {
            sendError = error;
            return null;
        });

        if (!requestMessage) {
            console.error("[provasro] falha ao enviar solicitacao para o canal de analise:", sendError);
            await interaction.editReply({
                embeds: [
                    buildErrorEmbed([
                        "Falha ao enviar para o canal de analise.",
                        "Verifique permissoes do bot e tente novamente.",
                        `Detalhe: ${formatErrorMessage(sendError)}`,
                    ].join("\n")),
                ],
            });
            return;
        }

        const savedRequest = await db.roRequests.create({
            guildId: interaction.guildId,
            userId: interaction.user.id,
            channelId: analysisChannelId,
            messageId: requestMessage.id,
            orgPm: pending.orgPm,
            fac: pending.fac,
            motivo: pending.motivo,
            clipUrl,
            status: "pending",
        }).catch((error) => {
            sendError = error;
            return null;
        });

        if (!savedRequest) {
            await requestMessage.delete().catch(() => null);
            console.error("[provasro] falha ao salvar solicitacao no banco:", sendError);
            await interaction.editReply({
                embeds: [buildErrorEmbed("Falha ao registrar solicitacao no banco. Tente novamente.")],
            });
            return;
        }

        pendingRoRequests.delete(pendingKey);

        await interaction.editReply({
            embeds: [buildSuccessEmbed(`Solicitacao enviada com sucesso para analise em <#${analysisChannelId}>.`)],
        });

        await notifyRoleMembers({
            guild: interaction.guild,
            requesterId: interaction.user.id,
            requesterTag: interaction.user.tag,
            orgPm: pending.orgPm,
            fac: pending.fac,
            motivo: pending.motivo,
            date: now,
            analysisMessageUrl: requestMessage.url,
        });
    },
});

createResponder({
    customId: REVIEW_APPROVE_CUSTOM_ID,
    types: [ResponderType.Button],
    cache: "cached",
    async run(interaction) {
        await handleReviewDecision(interaction, "approved");
    },
});

createResponder({
    customId: REVIEW_REJECT_CUSTOM_ID,
    types: [ResponderType.Button],
    cache: "cached",
    async run(interaction) {
        await handleReviewDecision(interaction, "rejected");
    },
});

async function handleReviewDecision(interaction: ButtonInteraction<"cached">, decision: RoDecision) {
    if (!interaction.memberPermissions.has("ManageGuild")) {
        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [buildErrorEmbed("Voce precisa de Gerenciar Servidor para analisar solicitacoes.")],
        });
        return;
    }

    const currentEmbed = interaction.message.embeds[0];
    if (!currentEmbed) {
        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [buildErrorEmbed("Nao encontrei o embed da solicitacao.")],
        });
        return;
    }

    if (hasFinalStatus(currentEmbed)) {
        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [buildErrorEmbed("Essa solicitacao ja foi finalizada.")],
        });
        return;
    }

    const updated = EmbedBuilder.from(currentEmbed);
    const fields = [...(updated.data.fields ?? [])];
    const statusIndex = fields.findIndex((field) => field.name === "Status");

    const status = decision === "approved" ? "APROVADO" : "RECUSADO";
    const statusValue = [
        status,
        `Responsavel: ${interaction.user}`,
        `Horario: ${formatDate(new Date())}`,
    ].join("\n");

    if (statusIndex >= 0) {
        fields[statusIndex] = { name: "Status", value: statusValue, inline: false };
    } else {
        fields.push({ name: "Status", value: statusValue, inline: false });
    }

    updated
        .setFields(fields)
        .setColor(decision === "approved" ? "#16a34a" : "#dc2626")
        .setTimestamp();

    await interaction.update({
        embeds: [updated],
        components: [buildReviewButtons(true)],
    });

    const requesterId = extractRequesterId(currentEmbed);
    if (!requesterId) return;

    const orgPm = extractField(currentEmbed, "ORG PM solicitante")
        ?? extractField(currentEmbed, "ORG PM")
        ?? "Nao informado";
    const fac = extractField(currentEmbed, "FAC")
        ?? extractField(currentEmbed, "ORG")
        ?? "Nao informado";
    const motivo = extractField(currentEmbed, "MOTIVO") ?? "Nao informado";

    const target = await interaction.client.users.fetch(requesterId).catch(() => null);
    if (target) {
        const decisionAt = new Date();
        const privateMessage = buildRODecisionPrivateMessage({
            decision,
            orgPm,
            fac,
            motivo,
            reviewer: `${interaction.user}`,
            at: decisionAt,
        });
        const sent = await target.send(privateMessage).catch(() => null);

        if (!sent) {
            await target.send({
                embeds: [
                    buildRODecisionPrivateFallbackEmbed({
                        decision,
                        orgPm,
                        fac,
                        motivo,
                        reviewer: `${interaction.user}`,
                        at: decisionAt,
                    }),
                ],
            }).catch(() => null);
        }
    }

    await sendRoDecisionLogAndCleanup({
        interaction,
        decision,
        requesterId,
        orgPm,
        fac,
        motivo,
    });
}

function buildInfoModal() {
    return new ModalBuilder()
        .setCustomId(MODAL_INFO_CUSTOM_ID)
        .setTitle("**Solicitação de R.O em FAC**")
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId(FIELD_ORG_PM_ID)
                    .setLabel("ORG PM solicitante")
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(1)
                    .setMaxLength(70)
                    .setRequired(true),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId(FIELD_FAC_ID)
                    .setLabel("FAC")
                    .setStyle(TextInputStyle.Short)
                    .setMinLength(1)
                    .setMaxLength(70)
                    .setRequired(true),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId(FIELD_MOTIVO_ID)
                    .setLabel("MOTIVO")
                    .setStyle(TextInputStyle.Paragraph)
                    .setMinLength(3)
                    .setMaxLength(700)
                    .setRequired(true),
            ),
        );
}

function buildUploadModal() {
    return new ModalBuilder()
        .setCustomId(MODAL_UPLOAD_CUSTOM_ID)
        .setTitle("Link do clipe")
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId(FIELD_PROOF_LINK_ID)
                    .setLabel("LINK DO CLIPE")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder("https://...")
                    .setMinLength(8)
                    .setMaxLength(500)
                    .setRequired(true),
            ),
        );
}

function buildOpenUploadButtonRow(guildId: string, userId: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`provasro/upload/open/${guildId}/${userId}`)
            .setStyle(ButtonStyle.Primary)
            .setLabel("Enviar link da prova"),
    );
}

function buildReviewButtons(disabled: boolean) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(REVIEW_APPROVE_CUSTOM_ID)
            .setLabel("Aceitar")
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(REVIEW_REJECT_CUSTOM_ID)
            .setLabel("Recusar")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled),
    );
}

function buildFormReceivedEmbed(orgPm: string, fac: string) {
    return new EmbedBuilder()
        .setColor("#3b82f6")
        .setTitle("Formulario recebido com sucesso")
        .setDescription([
            "Sua solicitacao foi registrada.",
            "Clique no botao abaixo para enviar o **link da prova**.",
        ].join("\n"))
        .addFields(
            { name: "ORG PM solicitante", value: orgPm, inline: true },
            { name: "FAC", value: fac, inline: true },
        )
        .setFooter({ text: "Sistema R.O em FAC" })
        .setTimestamp();
}

function buildAnalysisRequestEmbed(input: {
    requester: { id: string; toString(): string; };
    orgPm: string;
    fac: string;
    motivo: string;
    clipUrl: string;
    at: Date;
}) {
    return new EmbedBuilder()
        .setColor("#ff7b00")
        .setTitle("Solicitacao de R.O em FAC")
        .addFields(
            { name: "ORG PM solicitante", value: input.orgPm, inline: false },
            { name: "FAC", value: input.fac, inline: false },
            { name: "MOTIVO", value: input.motivo, inline: false },
            { name: "PROVA (link)", value: `[Abrir prova](${input.clipUrl})`, inline: false },
            { name: "Autor", value: `${input.requester}\n\`${input.requester.id}\``, inline: false },
            { name: "Data/Hora", value: formatDate(input.at), inline: false },
            { name: "Status", value: "PENDENTE", inline: false },
        )
        .setTimestamp(input.at)
        .setFooter({ text: "Sistema de Solicitacao de R.O em FAC" });
}

async function ensureRoPanelMessages(client: Client<true>) {
    const panelChannelIds = new Set<string>();

    await Promise.all(
        [...client.guilds.cache.values()].map(async (guild) => {
            const guildData = await db.guilds.get(guild.id);
            const panelChannelId = guildData.channels?.roPanel?.trim();
            if (!panelChannelId) return;
            panelChannelIds.add(panelChannelId);
        }),
    );

    await Promise.all(
        [...panelChannelIds].map((channelId) => ensureRoPanelMessageByChannel(client, channelId)),
    );
}

async function ensureRoPanelMessageByChannel(client: Client<true>, panelChannelId: string) {
    const channel = await client.channels.fetch(panelChannelId).catch(() => null);
    if (!channel || !channel.isTextBased() || !("send" in channel) || !("messages" in channel)) return;

    const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    const existing = messages?.find((message) => isRoPanelMessage(message, client.user.id)) ?? null;
    const payload = createRoPanelPayloadV2();

    if (existing) {
        await existing.edit(payload).catch(() => null);
        return;
    }

    await channel.send(payload).catch(() => null);
}

export function buildRONotifyMessage(input: {
    requesterId: string;
    requesterTag: string;
    orgPm: string;
    fac: string;
    motivo: string;
    date: Date;
    analysisMessageUrl: string;
}) {
    const content = applyPlaceholders(RO_NOTIFY_MESSAGE_TEMPLATE, {
        autor: `<@${input.requesterId}> (${input.requesterTag})`,
        orgPm: input.orgPm,
        fac: input.fac,
        motivo: input.motivo,
        data: formatDate(input.date),
        canalAnalise: input.analysisMessageUrl,
    });

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setLabel("Acessar Canal de Análise")
            .setStyle(ButtonStyle.Link)
            .setURL(input.analysisMessageUrl),
    );

    const container = new ContainerBuilder()
        .setAccentColor(0xf59e0b)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(RO_NOTIFY_MESSAGE_TITLE))
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(RO_NOTIFY_MESSAGE_INTRO))
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(RO_NOTIFY_MESSAGE_FOOTER))
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true),
        )
        .addActionRowComponents(actionRow);

    return {
        flags: ["IsComponentsV2"] as const,
        components: [container],
    };
}

function buildRODecisionPrivateMessage(input: {
    decision: RoDecision;
    orgPm: string;
    fac: string;
    motivo: string;
    reviewer: string;
    at: Date;
}) {
    const approved = input.decision === "approved";
    const title = approved
        ? "✅ # Atualização da sua solicitação de R.O"
        : "❌ # Atualização da sua solicitação de R.O";
    const intro = approved
        ? "Sua solicitação foi **aprovada**."
        : "Sua solicitação foi **recusada**.";
    const details = [
        `**ORG PM solicitante:** ${input.orgPm}`,
        `**FAC:** ${input.fac}`,
        `**Motivo:** ${input.motivo}`,
        `**Resp's:** ${input.reviewer}`,
        `**Data:** ${formatDate(input.at)}`,
    ].join("\n");
    const observation = approved
        ? [
            "🚨 Observação:",
            "Você tem **1 hora** após a aprovação para estarem fazendo R.O na FAC.",
            "Após esse prazo, **não será mais permitido** usar esta solicitação para R.O.",
        ].join("\n")
        : "Se necessário, revise os requisitos e tente novamente.";

    const container = new ContainerBuilder()
        .setAccentColor(approved ? 0x16a34a : 0xdc2626)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(intro))
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(details))
        .addSeparatorComponents(
            new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(true),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(observation));

    return {
        flags: ["IsComponentsV2"] as const,
        components: [container],
    };
}

function buildRODecisionPrivateFallbackEmbed(input: {
    decision: RoDecision;
    orgPm: string;
    fac: string;
    motivo: string;
    reviewer: string;
    at: Date;
}) {
    const approved = input.decision === "approved";
    return new EmbedBuilder()
        .setColor(approved ? "#16a34a" : "#dc2626")
        .setTitle("Atualização da sua solicitação de R.O")
        .setDescription([
            approved ? "Sua solicitação foi **aprovada**." : "Sua solicitação foi **recusada**.",
            `ORG PM solicitante: ${input.orgPm}`,
            `FAC: ${input.fac}`,
            `Motivo: ${input.motivo}`,
            `Responsável: ${input.reviewer}`,
            `Data: ${formatDate(input.at)}`,
            ...(approved
                ? [
                    "",
                    "🚨 Observação:",
                    "Você tem **1 hora** após a aprovação para solicitar/fazer R.O na FAC.",
                    "Após esse prazo, **não será mais permitido** usar esta solicitação para R.O.",
                ]
                : []),
        ].join("\n"))
        .setTimestamp(input.at);
}

async function notifyRoleMembers(input: {
    guild: Guild;
    requesterId: string;
    requesterTag: string;
    orgPm: string;
    fac: string;
    motivo: string;
    date: Date;
    analysisMessageUrl: string;
}) {
    const guildData = await db.guilds.get(input.guild.id);
    const notifyRoleIds = getRoNotifyRoleIds(guildData);
    if (!notifyRoleIds.length) return;

    const roles = (await Promise.all(
        notifyRoleIds.map(async (roleId) =>
            input.guild.roles.cache.get(roleId)
            ?? await input.guild.roles.fetch(roleId).catch(() => null),
        ),
    )).filter((role): role is NonNullable<typeof role> => !!role);
    if (!roles.length) return;

    if (input.guild.members.cache.size < input.guild.memberCount) {
        await input.guild.members.fetch().catch(() => null);
    }

    const messagePayload = buildRONotifyMessage(input);

    const membersById = new Map<string, GuildMember>();
    for (const role of roles) {
        for (const member of role.members.values()) {
            if (member.user.bot) continue;
            membersById.set(member.id, member);
        }
    }

    const members = [...membersById.values()];
    if (!members.length) return;
    await Promise.allSettled(members.map((member) => member.send(messagePayload)));
}

async function sendRoDecisionLogAndCleanup(input: {
    interaction: ButtonInteraction<"cached">;
    decision: RoDecision;
    requesterId: string;
    orgPm: string;
    fac: string;
    motivo: string;
}) {
    const roRequest = await db.roRequests.findOne({
        guildId: input.interaction.guildId,
        messageId: input.interaction.message.id,
    }).catch((error) => {
        console.error("[provasro] falha ao carregar solicitacao do banco:", error);
        return null;
    });

    if (!roRequest) return;

    const statusLabel = input.decision === "approved" ? "APROVADO" : "RECUSADO";
    const statusColor = input.decision === "approved" ? "#16a34a" : "#dc2626";

    await db.roRequests.updateOne(
        { _id: roRequest._id },
        { status: input.decision, reviewedBy: input.interaction.user.id, reviewedAt: new Date() },
    ).catch(() => null);

    const guildData = await db.guilds.get(input.interaction.guildId);
    const logChannelId = guildData.channels?.roDecisionLogs?.trim();

    if (logChannelId) {
        const logChannel = await input.interaction.client.channels.fetch(logChannelId).catch(() => null);
        if (logChannel && logChannel.isTextBased() && "send" in logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(statusColor)
                .setTitle("Log de decisao - R.O em FAC")
                .addFields(
                    { name: "Status", value: statusLabel, inline: false },
                    { name: "Autor", value: `<@${input.requesterId}>\n\`${input.requesterId}\``, inline: false },
                    { name: "ORG PM solicitante", value: input.orgPm, inline: false },
                    { name: "FAC", value: input.fac, inline: false },
                    { name: "MOTIVO", value: input.motivo, inline: false },
                    { name: "Responsavel", value: `${input.interaction.user}`, inline: false },
                    { name: "Horario", value: formatDate(new Date()), inline: false },
                )
                .setTimestamp();

            const clipUrl = roRequest.clipUrl?.trim() || "";

            if (clipUrl) {
                logEmbed.addFields({
                    name: "Clipe (link)",
                    value: `[Abrir clipe](${clipUrl})`,
                    inline: false,
                });
            }

            await logChannel.send({
                embeds: [logEmbed],
            }).catch((error) => {
                console.error("[provasro] falha ao enviar log de decisao:", error);
            });
        }
    }
    await db.roRequests.deleteOne({ _id: roRequest._id }).catch((error) => {
        console.error("[provasro] falha ao limpar solicitacao do banco:", error);
    });
}

function buildErrorEmbed(description: string) {
    return new EmbedBuilder()
        .setColor("#ef4444")
        .setTitle("Solicitacao de R.O em FAC")
        .setDescription(description)
        .setTimestamp();
}

function buildSuccessEmbed(description: string) {
    return new EmbedBuilder()
        .setColor("#22c55e")
        .setTitle("Solicitacao de R.O em FAC")
        .setDescription(description)
        .setTimestamp();
}

function makePendingKey(guildId: string, userId: string) {
    return `${guildId}:${userId}`;
}

function getPendingRequest(key: string) {
    sweepExpiredPendingRequests();
    return pendingRoRequests.get(key) ?? null;
}

function sweepExpiredPendingRequests(now = Date.now()) {
    for (const [key, pending] of pendingRoRequests) {
        if (now - pending.createdAt >= RO_PENDING_TTL_MS) {
            pendingRoRequests.delete(key);
        }
    }
}

function normalizeInput(value: string, maxLength: number) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function normalizeClipUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

function getRoNotifyRoleIds(guildData: { roles?: unknown; }) {
    const roles = guildData.roles as { roNotifyRoles?: string[]; } | undefined;
    return (roles?.roNotifyRoles ?? [])
        .map((id) => id?.trim())
        .filter((id): id is string => !!id);
}

function hasFinalStatus(embed: { fields: { name: string; value: string; }[]; }) {
    const statusField = embed.fields?.find((field) => field.name === "Status");
    if (!statusField) return false;
    const statusValue = statusField.value.toUpperCase();
    return statusValue.includes("APROVADO") || statusValue.includes("RECUSADO");
}

function extractRequesterId(embed: { fields: { name: string; value: string; }[]; }) {
    const authorField = embed.fields?.find((field) => field.name === "Autor");
    const authorValue = authorField?.value ?? "";
    const match = /`(\d{17,20})`/.exec(authorValue);
    return match?.[1] ?? null;
}

function extractField(embed: { fields: { name: string; value: string; }[]; }, name: string) {
    return embed.fields?.find((field) => field.name === name)?.value ?? null;
}

function applyPlaceholders(
    template: string,
    data: Record<"autor" | "orgPm" | "fac" | "motivo" | "data" | "canalAnalise", string>,
) {
    return template
        .replace(/\{autor\}/gi, data.autor)
        .replace(/\{org_pm\}/gi, data.orgPm)
        .replace(/\{fac\}/gi, data.fac)
        .replace(/\{org\}/gi, data.orgPm)
        .replace(/\{motivo\}/gi, data.motivo)
        .replace(/\{canal_analise\}/gi, data.canalAnalise)
        .replace(/\{analysis_url\}/gi, data.canalAnalise)
        .replace(/\{link\}/gi, data.canalAnalise)
        .replace(/\{data\}/gi, data.data);
}

function formatDate(date: Date) {
    return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

async function cleanupOldRoStorage() {
    const cutoff = new Date(Date.now() - RO_STORAGE_CLEANUP_INTERVAL_MS);
    const deleted = await db.roRequests.deleteMany({
        createdAt: { $lt: cutoff },
    }).catch((error) => {
        console.error("[provasro] falha ao limpar registros antigos de R.O:", error);
        return null;
    });

    if (deleted) {
        console.info(`[provasro] limpeza automatica: ${deleted.deletedCount} registro(s) com mais de ${RO_STORAGE_RETENTION_DAYS} dias removidos.`);
    }
}

async function cleanupRoLegacyFields() {
    const cleaned = await db.roRequests.collection.updateMany(
        {
            $or: [
                { clipPath: { $exists: true } },
                { clipTooLarge: { $exists: true } },
                { clipName: { $exists: true } },
                { clipSize: { $exists: true } },
            ],
        },
        {
            $unset: {
                clipPath: "",
                clipTooLarge: "",
                clipName: "",
                clipSize: "",
            },
        },
    ).catch((error) => {
        console.error("[provasro] falha ao limpar campos legados:", error);
        return null;
    });

    if (cleaned && cleaned.modifiedCount > 0) {
        console.info(`[provasro] limpeza de legado: ${cleaned.modifiedCount} registro(s) atualizados.`);
    }
}

function formatErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message.slice(0, 180);
    if (typeof error === "string") return error.slice(0, 180);
    return "erro desconhecido";
}
