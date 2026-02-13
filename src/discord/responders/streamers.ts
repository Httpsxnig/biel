import { createResponder } from "#base";
import { db } from "#database";
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
import { EmbedBuilder, type Client, type Message } from "discord.js";

createResponder({
    customId: "streamers/form/start/:guildId",
    types: [ResponderType.Button],
    parse: (params) => ({ guildId: params.guildId }),
    async run(interaction, { guildId }) {
        const current = activeStreamerForms.get(interaction.user.id);
        if (current) {
            await interaction.reply({
                flags: ["Ephemeral"],
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
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("success", "Formulario iniciado", "Confira seu privado para responder as perguntas.")],
            });
        } catch {
            activeStreamerForms.delete(interaction.user.id);
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("error", "Falha ao iniciar", "Nao consegui te enviar DM. Ative mensagens privadas.")],
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

        const config = await db.streamerConfigs.get(state.guildId);
        const applicationChannelId = config.channels?.applications;
        if (!applicationChannelId) {
            await interaction.update({
                embeds: [createNoticeEmbed("error", "Canal de analise ausente", "Configure no /painel em Streamers: Canal de analise.")],
                components: [],
            });
            return;
        }

        const channel = await interaction.client.channels.fetch(applicationChannelId).catch(() => null);
        if (!channel || !channel.isTextBased() || !("send" in channel)) {
            await interaction.update({
                embeds: [createNoticeEmbed("error", "Canal invalido", "Nao consegui acessar o canal de analise configurado.")],
                components: [],
            });
            return;
        }

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
        await interaction.update({
            embeds: [createNoticeEmbed("success", "Formulario enviado", "Seu pedido foi enviado para analise.")],
            components: [],
        });
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

        await interaction.reply({
            flags: ["Ephemeral"],
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

        const selected = interaction.values[0] as StreamerRoleKey;
        const config = await db.streamerConfigs.get(request.guildId);
        const roleId = config.roles?.[selected];
        if (!roleId) {
            await interaction.update({
                embeds: [createNoticeEmbed("error", "Cargo nao configurado", "O cargo selecionado nao foi configurado.")],
                components: [],
            });
            return;
        }

        const member = await interaction.guild.members.fetch(request.userId).catch(() => null);
        if (!member) {
            await interaction.update({
                embeds: [createNoticeEmbed("error", "Membro nao encontrado", "O usuario nao esta no servidor.")],
                components: [],
            });
            return;
        }

        const roleAdded = await member.roles.add(roleId).then(() => true).catch(async () => {
            await interaction.update({
                embeds: [createNoticeEmbed("error", "Falha ao setar cargo", "Verifique se o bot tem permissao e hierarquia.")],
                components: [],
            });
            return false;
        });
        if (!roleAdded) return;

        request.set("status", "approved");
        request.set("selectedRoleKey", selected);
        request.set("reviewedBy", interaction.user.id);
        request.set("reviewedAt", new Date());
        await request.save();

        const roleLabel = streamerRoleLabels[selected];
        await updateRequestMessage(interaction.client, request.id, request.channelId, request.messageId, {
            statusText: `Aprovado por ${interaction.user}\nCargo: <@&${roleId}>`,
            color: "#22c55e",
        });

        const target = await interaction.client.users.fetch(request.userId).catch(() => null);
        if (target) {
            await target.send({ embeds: [createStreamerApprovedEmbed(roleLabel)] }).catch(() => null);
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
                                `Aprovado por: ${interaction.user}`,
                            ].join("\n"))
                            .setTimestamp()
                    ],
                }).catch(() => null);
            }
        }

        await interaction.update({
            embeds: [createNoticeEmbed("success", "Aprovacao concluida", `Cargo aplicado: **${roleLabel}**`)],
            components: [],
        });
    },
});

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
        await message.author.send({
            embeds: [
                createNoticeEmbed(
                    "error",
                    "Resposta invalida",
                    "Na pergunta 8/8 voce precisa enviar uma imagem (print). Tente novamente com anexo de imagem."
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
