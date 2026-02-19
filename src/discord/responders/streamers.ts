import { createResponder } from "#base";
import { db } from "#database";
import { env } from "#env";
import {
    activeStreamerForms,
    createNoticeEmbed,
    createStreamerApprovedEmbed,
    createStreamerConfirmButtons,
    createStreamerQuestionEmbed,
    createStreamerRejectedEmbed,
    createStreamerRequestEmbed,
    createStreamerReviewButtons,
    createStreamerRoleSelect,
    createStreamerSummaryEmbed,
    streamerRoleLabels,
    streamerQuestions,
    type StreamerRoleKey,
} from "#functions";
import { ResponderType } from "@constatic/base";
import { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, type Client, type Message } from "discord.js";

type StreamerFunctionKey = "legal" | "ilegal" | "bombeiro" | "hospital";

const streamerFunctionLabels: Record<StreamerFunctionKey, string> = {
    legal: "Legal",
    ilegal: "Ilegal",
    bombeiro: "ㅤʙᴏᴍʙᴇɪʀᴏ",
    hospital: "ㅤʜᴏsᴘɪᴛᴀʟ",
};

createResponder({
    customId: "streamers/form/start/:guildId",
    types: [ResponderType.Button],
    parse: (params) => ({ guildId: params.guildId }),
    async run(interaction, { guildId }) {
        await interaction.deferReply({
            flags: ["Ephemeral"],
        }).catch(() => null);

        const current = activeStreamerForms.get(interaction.user.id);
        if (current) {
            await interaction.editReply({
                embeds: [createNoticeEmbed("warning", "Formulario em andamento", "Voce ja possui um formulario aberto no privado.")],
            });
            return;
        }

        const state = {
            guildId,
            step: 0,
            answers: {},
            attachments: [],
        };
        activeStreamerForms.set(interaction.user.id, state);

        try {
            await interaction.user.send({
                embeds: [createStreamerQuestionEmbed(state)],
            });
            await interaction.editReply({
                embeds: [createNoticeEmbed("success", "Formulario iniciado", "Confira seu privado para responder as perguntas.")],
            });
        } catch (error) {
            activeStreamerForms.delete(interaction.user.id);
            const errorCode = typeof error === "object" && error && "code" in error
                ? Number((error as { code?: number | string; }).code)
                : null;
            const description = errorCode === 50007
                ? "Nao consegui te enviar DM. Verifique privacidade de DMs para membros do servidor."
                : "Falha interna ao montar sua DM de formulario. Tente novamente.";
            await interaction.editReply({
                embeds: [createNoticeEmbed("error", "Falha ao iniciar", description)],
            });
        }
    },
});

createResponder({
    customId: "streamers/form/requirements/:guildId",
    types: [ResponderType.Button],
    parse: (params) => ({ guildId: params.guildId }),
    async run(interaction, { guildId }) {
        const config = await db.streamerConfigs.get(guildId);
        const channelId = config.channels?.requirements;

        if (!channelId) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("warning", "Canal nao configurado", "O canal de requisitos ainda nao foi configurado.")],
            });
            return;
        }

        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [createNoticeEmbed("info", "Requisitos", `Acesse <#${channelId}> para ver os requisitos.`)],
        });
    },
});

createResponder({
    customId: "streamers/form/benefits/:guildId",
    types: [ResponderType.Button],
    parse: (params) => ({ guildId: params.guildId }),
    async run(interaction, { guildId }) {
        const config = await db.streamerConfigs.get(guildId);
        const channelId = config.channels?.benefits;

        if (!channelId) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("warning", "Canal nao configurado", "O canal de beneficios ainda nao foi configurado.")],
            });
            return;
        }

        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [createNoticeEmbed("info", "Beneficios", `Acesse <#${channelId}> para ver os beneficios.`)],
        });
    },
});

createResponder({
    customId: "streamers/form/confirm/:userId",
    types: [ResponderType.Button],
    parse: (params) => ({ userId: params.userId }),
    async run(interaction, { userId }) {
        if (interaction.user.id !== userId) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("error", "Formulario de outro usuario", "Apenas o dono pode confirmar este formulario.")],
            });
            return;
        }

        const state = activeStreamerForms.get(userId);
        if (!state) {
            await interaction.update({
                embeds: [createNoticeEmbed("warning", "Formulario expirado", "Seu formulario nao foi encontrado.")],
                components: [],
            });
            return;
        }

        await interaction.deferUpdate().catch(() => null);

        const config = await db.streamerConfigs.get(state.guildId);
        const applicationChannelId = config.channels?.applications;
        if (!applicationChannelId) {
            await interaction.editReply({
                embeds: [createNoticeEmbed("error", "Canal de analise ausente", "Configure no /painel em Streamers: Canal de analise.")],
                components: [],
            });
            return;
        }

        const channel = await interaction.client.channels.fetch(applicationChannelId).catch(() => null);
        if (!channel || !channel.isTextBased() || !("send" in channel)) {
            await interaction.editReply({
                embeds: [createNoticeEmbed("error", "Canal invalido", "Nao consegui acessar o canal de analise configurado.")],
                components: [],
            });
            return;
        }

        try {
            const request = await db.streamerRequests.create({
                guildId: state.guildId,
                userId,
                answers: state.answers,
                attachments: state.attachments,
                status: "pending",
            });

            const message = await channel.send({
                embeds: [createStreamerRequestEmbed(interaction.user, state.answers, state.attachments, config.footer ?? "Sistema de Streamers")],
                components: [createStreamerReviewButtons(request.id)],
            });

            request.set("channelId", message.channelId);
            request.set("messageId", message.id);
            await request.save();

            activeStreamerForms.delete(userId);
            await interaction.editReply({
                embeds: [createNoticeEmbed("success", "Formulario enviado", "Seu pedido foi enviado para analise.")],
                components: [],
            });
        } catch {
            await interaction.editReply({
                embeds: [createNoticeEmbed("error", "Falha ao enviar", "Nao foi possivel enviar seu pedido. Tente novamente.")],
                components: [createStreamerConfirmButtons(userId)],
            }).catch(() => null);
        }
    },
});

createResponder({
    customId: "streamers/form/cancel/:userId",
    types: [ResponderType.Button],
    parse: (params) => ({ userId: params.userId }),
    async run(interaction, { userId }) {
        if (interaction.user.id !== userId) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("error", "Formulario de outro usuario", "Apenas o dono pode cancelar este formulario.")],
            });
            return;
        }

        activeStreamerForms.delete(userId);
        await interaction.update({
            embeds: [createNoticeEmbed("warning", "Formulario cancelado", "Seu formulario foi cancelado.")],
            components: [],
        });
    },
});

createResponder({
    customId: "streamers/review/approve/:requestId",
    types: [ResponderType.Button],
    cache: "cached",
    parse: (params) => ({ requestId: params.requestId }),
    async run(interaction, { requestId }) {
        if (!interaction.member.permissions.has("ManageGuild")) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("error", "Sem permissao", "Voce precisa de `Gerenciar Servidor`.")],
            });
            return;
        }

        const request = await db.streamerRequests.findById(requestId);
        if (!request || request.status !== "pending") {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("warning", "Pedido indisponivel", "Este pedido nao esta mais pendente.")],
            });
            return;
        }

        const config = await db.streamerConfigs.get(request.guildId);
        const selectRow = createStreamerRoleSelect(requestId, config);
        if (!selectRow) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("error", "Cargos nao configurados", "Configure no /painel em Streamers: Cargos.")],
            });
            return;
        }

        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [createNoticeEmbed("info", "Selecionar cargo", "Escolha abaixo o cargo para aprovacao.")],
            components: [selectRow],
        });
    },
});

createResponder({
    customId: "streamers/review/deny/:requestId",
    types: [ResponderType.Button],
    cache: "cached",
    parse: (params) => ({ requestId: params.requestId }),
    async run(interaction, { requestId }) {
        if (!interaction.member.permissions.has("ManageGuild")) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("error", "Sem permissao", "Voce precisa de `Gerenciar Servidor`.")],
            });
            return;
        }

        const request = await db.streamerRequests.findById(requestId);
        if (!request || request.status !== "pending") {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("warning", "Pedido indisponivel", "Este pedido nao esta mais pendente.")],
            });
            return;
        }

        await interaction.deferReply({
            flags: ["Ephemeral"],
        }).catch(() => null);

        request.set("status", "rejected");
        request.set("reviewedBy", interaction.user.id);
        request.set("reviewedAt", new Date());
        await request.save();

        await updateRequestMessage(interaction.client, request.id, request.channelId, request.messageId, {
            statusText: `Negado por ${interaction.user}`,
            color: "#ef4444",
        });

        const target = await interaction.client.users.fetch(request.userId).catch(() => null);
        if (target) {
            await target.send({ embeds: [createStreamerRejectedEmbed()] }).catch(() => null);
        }

        await interaction.editReply({
            embeds: [createNoticeEmbed("success", "Pedido negado", "O pedido foi negado e o usuario foi notificado.")],
        });
    },
});

createResponder({
    customId: "streamers/review/role/:requestId",
    types: [ResponderType.StringSelect],
    cache: "cached",
    parse: (params) => ({ requestId: params.requestId }),
    async run(interaction, { requestId }) {
        if (!interaction.member.permissions.has("ManageGuild")) {
            await interaction.update({
                embeds: [createNoticeEmbed("error", "Sem permissao", "Voce precisa de `Gerenciar Servidor`.")],
                components: [],
            });
            return;
        }

        const request = await db.streamerRequests.findById(requestId);
        if (!request || request.status !== "pending") {
            await interaction.update({
                embeds: [createNoticeEmbed("warning", "Pedido indisponivel", "Este pedido nao esta mais pendente.")],
                components: [],
            });
            return;
        }

        const selected = interaction.values[0];
        if (!isStreamerRoleKey(selected)) {
            await interaction.update({
                embeds: [createNoticeEmbed("error", "Cargo invalido", "Selecione um cargo valido para continuar.")],
                components: [],
            });
            return;
        }

        const config = await db.streamerConfigs.get(request.guildId);
        const roleId = config.roles?.[selected];
        if (!roleId) {
            await interaction.update({
                embeds: [createNoticeEmbed("error", "Cargo nao configurado", "O cargo selecionado nao foi configurado.")],
                components: [],
            });
            return;
        }

        await interaction.update({
            embeds: [
                createNoticeEmbed(
                    "info",
                    "Selecionar funcao",
                    `Set escolhido: **${streamerRoleLabels[selected]}**\nAgora escolha a funcao no set.`,
                ),
            ],
            components: [createStreamerFunctionSelect(requestId, selected)],
        });
    },
});

createResponder({
    customId: "streamers/review/function/:requestId/:selectedRole",
    types: [ResponderType.StringSelect],
    cache: "cached",
    parse: (params) => ({ requestId: params.requestId, selectedRole: params.selectedRole }),
    async run(interaction, { requestId, selectedRole }) {
        if (!interaction.member.permissions.has("ManageGuild")) {
            await interaction.update({
                embeds: [createNoticeEmbed("error", "Sem permissao", "Voce precisa de `Gerenciar Servidor`.")],
                components: [],
            });
            return;
        }

        if (!isStreamerRoleKey(selectedRole)) {
            await interaction.update({
                embeds: [createNoticeEmbed("error", "Cargo invalido", "O set selecionado nao e valido.")],
                components: [],
            });
            return;
        }

        const selectedFunction = interaction.values[0];
        if (!isStreamerFunctionKey(selectedFunction)) {
            await interaction.update({
                embeds: [createNoticeEmbed("error", "Funcao invalida", "Selecione uma funcao valida.")],
                components: [],
            });
            return;
        }

        await interaction.deferUpdate().catch(() => null);

        const request = await db.streamerRequests.findById(requestId);
        if (!request || request.status !== "pending") {
            await interaction.editReply({
                embeds: [createNoticeEmbed("warning", "Pedido indisponivel", "Este pedido nao esta mais pendente.")],
                components: [],
            });
            return;
        }

        const config = await db.streamerConfigs.get(request.guildId);
        const roleId = config.roles?.[selectedRole];
        if (!roleId) {
            await interaction.editReply({
                embeds: [createNoticeEmbed("error", "Cargo nao configurado", "O set selecionado nao foi configurado no painel.")],
                components: [],
            });
            return;
        }

        const functionRoleData = getFunctionRoleByKey(selectedFunction);
        if (!functionRoleData.roleId) {
            await interaction.editReply({
                embeds: [createNoticeEmbed("error", "Funcao sem cargo", functionRoleData.warning ?? "Cargo da funcao nao configurado no .env.")],
                components: [],
            });
            return;
        }

        const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
        if (!member) {
            await interaction.editReply({
                embeds: [createNoticeEmbed("error", "Membro nao encontrado", "O usuario nao esta no servidor.")],
                components: [],
            });
            return;
        }

        const verificationRoleData = getVerificationRoleByStreamerTier(selectedRole);
        const verificationRoleId = verificationRoleData.roleId;
        const rolesToAdd = new Set<string>([roleId]);
        const functionRoleId = functionRoleData.roleId;
        let appliedVerificationRoleId: string | null = null;
        let appliedFunctionRoleId: string | null = null;
        let verificationWarning: string | null = verificationRoleData.warning;

        if (verificationRoleId) {
            if (interaction.guild.roles.cache.has(verificationRoleId)) {
                rolesToAdd.add(verificationRoleId);
                appliedVerificationRoleId = verificationRoleId;
            } else {
                verificationWarning = "Cargo VERF configurado no .env nao encontrado no servidor.";
            }
        }

        if (!functionRoleId || !interaction.guild.roles.cache.has(functionRoleId)) {
            await interaction.editReply({
                embeds: [createNoticeEmbed("error", "Cargo da funcao invalido", "O cargo da funcao escolhida nao existe neste servidor.")],
                components: [],
            });
            return;
        }
        rolesToAdd.add(functionRoleId);
        appliedFunctionRoleId = functionRoleId;

        const roleAdded = await member.roles.add([...rolesToAdd]).then(() => true).catch(async () => {
            await interaction.editReply({
                embeds: [createNoticeEmbed("error", "Falha ao setar cargo", "Verifique se o bot tem permissao e hierarquia.")],
                components: [],
            });
            return false;
        });
        if (!roleAdded) return;

        request.set("status", "approved");
        request.set("selectedRoleKey", selectedRole);
        request.set("reviewedBy", interaction.user.id);
        request.set("reviewedAt", new Date());
        await request.save();

        const roleLabel = streamerRoleLabels[selectedRole];
        const functionLabel = streamerFunctionLabels[selectedFunction];
        await updateRequestMessage(interaction.client, request.id, request.channelId, request.messageId, {
            statusText: [
                `Aprovado por ${interaction.user}`,
                `Cargo: <@&${roleId}>`,
                `Funcao: **${functionLabel}**`,
                appliedFunctionRoleId ? `Cargo funcao: <@&${appliedFunctionRoleId}>` : null,
                appliedVerificationRoleId ? `Cargo VERF: <@&${appliedVerificationRoleId}>` : null,
            ].filter(Boolean).join("\n"),
            color: "#22c55e",
        });

        const target = await interaction.client.users.fetch(request.userId).catch(() => null);
        if (target) {
            await target.send({ embeds: [createStreamerApprovedEmbed(`${roleLabel} | ${functionLabel}`)] }).catch(() => null);
        }

        if (config.channels?.approvedLogs) {
            const logsChannel = await interaction.client.channels.fetch(config.channels.approvedLogs).catch(() => null);
            if (logsChannel && logsChannel.isTextBased() && "send" in logsChannel) {
                await logsChannel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#f59e0b")
                            .setTitle("Streamer aprovado")
                            .setDescription([
                                `Usuario: <@${request.userId}>`,
                                `Cargo: <@&${roleId}>`,
                                `Funcao: **${functionLabel}**`,
                                appliedFunctionRoleId ? `Cargo funcao: <@&${appliedFunctionRoleId}>` : null,
                                appliedVerificationRoleId ? `Cargo VERF: <@&${appliedVerificationRoleId}>` : null,
                                `Aprovado por: ${interaction.user}`,
                            ].filter(Boolean).join("\n"))
                            .setTimestamp()
                    ],
                }).catch(() => null);
            }
        }

        const responseLines = [
            `Set aplicado: **${roleLabel}**`,
            `Funcao escolhida: **${functionLabel}**`,
        ];
        if (appliedFunctionRoleId) {
            responseLines.push(`Cargo de funcao aplicado: <@&${appliedFunctionRoleId}>`);
        }
        if (appliedVerificationRoleId) {
            responseLines.push(`Cargo VERF aplicado: <@&${appliedVerificationRoleId}>`);
        }
        if (verificationWarning) {
            responseLines.push(`Aviso: ${verificationWarning}`);
        }

        await interaction.editReply({
            embeds: [createNoticeEmbed("success", "Aprovacao concluida", responseLines.join("\n"))],
            components: [],
        });
    },
});

function createStreamerFunctionSelect(requestId: string, selectedRole: StreamerRoleKey) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`streamers/review/function/${requestId}/${selectedRole}`)
            .setPlaceholder("Selecione a funcao do set")
            .addOptions(
                {
                    label: "Legal",
                    value: "legal",
                    emoji: "⚖️",
                },
                {
                    label: "Ilegal",
                    value: "ilegal",
                    emoji: "🔫",
                },
                {
                    label: "ㅤʙᴏᴍʙᴇɪʀᴏ",
                    value: "bombeiro",
                    emoji: "🚒",
                },
                {
                    label: "ㅤʜᴏsᴘɪᴛᴀʟ",
                    value: "hospital",
                    emoji: "🏥",
                },
            )
            .setMinValues(1)
            .setMaxValues(1),
    );
}

function isStreamerRoleKey(value: string): value is StreamerRoleKey {
    return Object.prototype.hasOwnProperty.call(streamerRoleLabels, value);
}

function isStreamerFunctionKey(value: string): value is StreamerFunctionKey {
    return value === "legal" || value === "ilegal" || value === "bombeiro" || value === "hospital";
}

function getFunctionRoleByKey(selected: StreamerFunctionKey) {
    const map: Record<StreamerFunctionKey, string | undefined> = {
        legal: env.CARGO_LEGAL,
        ilegal: env.CARGO_ILEGAL,
        bombeiro: env.CARGO_BOMBEIRO || env.CARGO_VERF3,
        hospital: env.CARGO_HOSPITAL || env.CARGO_VERF4,
    };
    const envKeyMap: Record<StreamerFunctionKey, string> = {
        legal: "CARGO_LEGAL",
        ilegal: "CARGO_ILEGAL",
        bombeiro: env.CARGO_BOMBEIRO?.trim()
            ? "CARGO_BOMBEIRO"
            : "CARGO_BOMBEIRO (fallback CARGO_VERF3)",
        hospital: env.CARGO_HOSPITAL?.trim()
            ? "CARGO_HOSPITAL"
            : "CARGO_HOSPITAL (fallback CARGO_VERF4)",
    };

    const roleId = normalizeRoleIdFromEnv(map[selected]);
    if (!map[selected]?.trim()) {
        return {
            roleId: null,
            warning: `${envKeyMap[selected]} nao definido no .env.`,
        };
    }
    if (!roleId) {
        return {
            roleId: null,
            warning: `${envKeyMap[selected]} invalido no .env. Use ID do cargo (ou mencao <@&ID>).`,
        };
    }

    return { roleId, warning: null as string | null };
}

function getVerificationRoleByStreamerTier(selected: StreamerRoleKey) {
    const map: Record<StreamerRoleKey, string | undefined> = {
        influencer: env.CARGO_VERF1,
        creator: env.CARGO_VERF2,
        tier1: env.CARGO_VERF3,
        tier2: env.CARGO_VERF4,
    };
    const envKeyMap: Record<StreamerRoleKey, string> = {
        influencer: "CARGO_VERF1",
        creator: "CARGO_VERF2",
        tier1: "CARGO_VERF3",
        tier2: "CARGO_VERF4",
    };

    const roleId = normalizeRoleIdFromEnv(map[selected]);
    if (!map[selected]?.trim()) {
        return { roleId: null, warning: null as string | null };
    }
    if (!roleId) {
        return {
            roleId: null,
            warning: `${envKeyMap[selected]} invalido no .env. Use ID do cargo (ou menção <@&ID>).`,
        };
    }

    return { roleId, warning: null as string | null };
}

function normalizeRoleIdFromEnv(value?: string) {
    const raw = value?.trim();
    if (!raw) return null;

    const mentionMatch = /^<@&(\d{17,20})>$/.exec(raw);
    if (mentionMatch) return mentionMatch[1];

    const idMatch = /^(\d{17,20})$/.exec(raw);
    if (idMatch) return idMatch[1];

    return null;
}

async function updateRequestMessage(
    client: Client,
    requestId: string,
    channelId?: string | null,
    messageId?: string | null,
    data?: { statusText?: string; color?: string; },
) {
    if (!channelId || !messageId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased() || !("messages" in channel)) return;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return;

    const current = message.embeds[0] ? EmbedBuilder.from(message.embeds[0]) : new EmbedBuilder();
    const fields = (current.data.fields ?? []).filter((field) => field.name !== "Status");

    if (data?.statusText) {
        fields.push({ name: "Status", value: data.statusText, inline: false });
    }
    current.setFields(fields);
    if (data?.color) {
        current.setColor(data.color as `#${string}`);
    }

    await message.edit({
        embeds: [current],
        components: [createStreamerReviewButtons(requestId, true)],
    });
}

export async function processStreamerFormMessage(message: Message) {
    if (!message.author || message.author.bot || message.guildId) return false;

    const state = activeStreamerForms.get(message.author.id);
    if (!state) return false;
    if (state.lastMessageId === message.id) return true;
    state.lastMessageId = message.id;

    const content = message.content.trim();
    if (["cancelar", "cancel", "cancelar formulario"].includes(content.toLowerCase())) {
        activeStreamerForms.delete(message.author.id);
        await message.author.send({
            embeds: [createNoticeEmbed("warning", "Formulario cancelado", "Seu formulario foi cancelado.")],
        });
        return true;
    }

    const question = streamerQuestions[state.step];
    if (!question) {
        activeStreamerForms.delete(message.author.id);
        return true;
    }

    const attachments = [...message.attachments.values()];
    const imageAttachments = attachments.filter((attachment) => {
        const contentType = attachment.contentType?.toLowerCase() ?? "";
        const fileName = attachment.name?.toLowerCase() ?? "";
        return (
            contentType.startsWith("image/") ||
            /\.(png|jpe?g|gif|webp|bmp)$/i.test(fileName)
        );
    });

    if (question.allowAttachment && imageAttachments.length === 0) {
        const questionNumber = state.step + 1;
        const totalQuestions = streamerQuestions.length;
        await message.author.send({
            embeds: [
                createNoticeEmbed(
                    "error",
                    "Resposta invalida",
                    `Na pergunta ${questionNumber}/${totalQuestions} voce precisa enviar uma imagem (print). Tente novamente com anexo de imagem.`
                ),
            ],
        });
        return true;
    }

    const attachmentLinks = (question.allowAttachment ? imageAttachments : attachments)
        .map((attachment) => attachment.url);
    if (attachmentLinks.length > 0) {
        state.attachments.push(...attachmentLinks);
    }

    const answer = content || (attachmentLinks.length > 0 ? "Anexo enviado" : "Sem resposta");
    state.answers[question.key] = answer;
    state.step += 1;

    if (state.step >= streamerQuestions.length) {
        await message.author.send({
            embeds: [createStreamerSummaryEmbed(state.answers)],
            components: [createStreamerConfirmButtons(message.author.id)],
        });
        return true;
    }

    await message.author.send({
        embeds: [createStreamerQuestionEmbed(state)],
    });
    return true;
}
