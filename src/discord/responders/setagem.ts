import { createResponder } from "#base";
import { db } from "#database";
import {
    buildChannelPicker,
    buildPrefixModal,
    buildRolePicker,
    buildSettingsV2PanelUpdate,
    buildStreamerImageModal,
    buildWatchingModal,
    createNoPermissionEmbed,
    createNoticeEmbed,
    isChannelSettingKey,
    isModuleSettingKey,
    isPanelChannelSettingKey,
    isPanelRoleSettingKey,
    isResetSettingKey,
    isRoleSettingKey,
    isStreamerChannelSettingKey,
    isStreamerResetSettingKey,
    isStreamerRoleSettingKey,
    normalizeImageUrl,
    normalizePrefix,
    normalizeWatching,
    panelChannelSettingLabels,
    panelRoleSettingLabels,
    streamerChannelConfigMap,
    streamerRoleConfigMap,
} from "#functions";
import { ResponderType } from "@constatic/base";
import { ActivityType, type Guild } from "discord.js";

async function ensureGuildContext(interaction: {
    guildId: string | null;
    guild: Guild | null;
    reply: (options: Record<string, unknown>) => Promise<unknown>;
}) {
    if (!interaction.guildId || !interaction.guild) {
        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [createNoticeEmbed("error", "Contexto invalido", "Use este painel dentro de um servidor.")],
        });
        return null;
    }

    return {
        guildId: interaction.guildId,
        guild: interaction.guild,
    };
}

async function ensurePanelPermission(interaction: {
    memberPermissions: { has(permission: unknown): boolean; } | null;
    reply: (options: Record<string, unknown>) => Promise<unknown>;
}) {
    if (interaction.memberPermissions?.has("ManageGuild")) return true;

    await interaction.reply({
        flags: ["Ephemeral"],
        embeds: [createNoPermissionEmbed("alterar as configuracoes do servidor")],
    });
    return false;
}

async function updatePanelMessage(interaction: {
    update: (options: Record<string, unknown>) => Promise<unknown>;
}, context: { guildId: string; guild: Guild; }) {
    const [guildData, streamerConfig] = await Promise.all([
        db.guilds.get(context.guildId),
        db.streamerConfigs.get(context.guildId),
    ]);
    await interaction.update(buildSettingsV2PanelUpdate(context.guild, guildData, streamerConfig));
}

createResponder({
    customId: "painel/select-channel",
    types: [ResponderType.StringSelect],
    async run(interaction) {
        if (!await ensurePanelPermission(interaction)) return;

        const key = interaction.values[0];
        if (!isPanelChannelSettingKey(key)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("error", "Canal invalido", "A chave do canal selecionado nao existe.")],
            });
            return;
        }

        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [
                createNoticeEmbed(
                    "info",
                    "Selecionar canal",
                    `Selecione o novo valor para ${panelChannelSettingLabels[key].toLowerCase()}.`
                ),
            ],
            components: [buildChannelPicker(key)],
        });
    },
});

createResponder({
    customId: "painel/channel/:key",
    types: [ResponderType.ChannelSelect],
    parse: (params) => ({ key: params.key }),
    async run(interaction, { key }) {
        if (!await ensurePanelPermission(interaction)) return;
        if (!isPanelChannelSettingKey(key)) {
            await interaction.update({
                embeds: [createNoticeEmbed("error", "Canal invalido", "A chave do canal selecionado nao existe.")],
                components: [],
            });
            return;
        }

        const context = await ensureGuildContext(interaction);
        if (!context) return;

        const channelId = interaction.values[0];
        if (isChannelSettingKey(key)) {
            const guildData = await db.guilds.get(context.guildId);
            guildData.set(`channels.${key}`, channelId);
            await guildData.save();
        } else if (isStreamerChannelSettingKey(key)) {
            const streamerConfig = await db.streamerConfigs.get(context.guildId);
            const configKey = streamerChannelConfigMap[key];
            streamerConfig.set(`channels.${configKey}`, channelId);
            await streamerConfig.save();
        }

        await interaction.update({
            embeds: [
                createNoticeEmbed(
                    "success",
                    "Canal atualizado",
                    `${panelChannelSettingLabels[key]} atualizado para <#${channelId}>.`,
                ),
            ],
            components: [],
        });
    },
});

createResponder({
    customId: "painel/select-role",
    types: [ResponderType.StringSelect],
    async run(interaction) {
        if (!await ensurePanelPermission(interaction)) return;

        const key = interaction.values[0];
        if (!isPanelRoleSettingKey(key)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("error", "Cargo invalido", "A chave do cargo selecionado nao existe.")],
            });
            return;
        }

        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [
                createNoticeEmbed(
                    "info",
                    "Selecionar cargo",
                    `Selecione o novo valor para ${panelRoleSettingLabels[key].toLowerCase()}.`
                ),
            ],
            components: [buildRolePicker(key)],
        });
    },
});

createResponder({
    customId: "painel/role/:key",
    types: [ResponderType.RoleSelect],
    parse: (params) => ({ key: params.key }),
    async run(interaction, { key }) {
        if (!await ensurePanelPermission(interaction)) return;
        if (!isPanelRoleSettingKey(key)) {
            await interaction.update({
                embeds: [createNoticeEmbed("error", "Cargo invalido", "A chave do cargo selecionado nao existe.")],
                components: [],
            });
            return;
        }

        const context = await ensureGuildContext(interaction);
        if (!context) return;

        const roleId = interaction.values[0];
        if (isRoleSettingKey(key)) {
            const guildData = await db.guilds.get(context.guildId);
            guildData.set(`roles.${key}`, roleId);
            await guildData.save();
        } else if (isStreamerRoleSettingKey(key)) {
            const streamerConfig = await db.streamerConfigs.get(context.guildId);
            const configKey = streamerRoleConfigMap[key];
            streamerConfig.set(`roles.${configKey}`, roleId);
            await streamerConfig.save();
        }

        await interaction.update({
            embeds: [
                createNoticeEmbed(
                    "success",
                    "Cargo atualizado",
                    `${panelRoleSettingLabels[key]} atualizado para <@&${roleId}>.`,
                ),
            ],
            components: [],
        });
    },
});

createResponder({
    customId: "painel/toggle/:module",
    types: [ResponderType.Button],
    parse: (params) => ({ module: params.module }),
    async run(interaction, { module }) {
        if (!await ensurePanelPermission(interaction)) return;
        if (!isModuleSettingKey(module)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("error", "Modulo invalido", "O modulo selecionado nao existe.")],
            });
            return;
        }

        const context = await ensureGuildContext(interaction);
        if (!context) return;

        const guildData = await db.guilds.get(context.guildId);
        const current = !!guildData.modules?.[module];
        guildData.set(`modules.${module}`, !current);
        await guildData.save();

        await updatePanelMessage(interaction, context);
    },
});

createResponder({
    customId: "painel/refresh",
    types: [ResponderType.Button],
    async run(interaction) {
        if (!await ensurePanelPermission(interaction)) return;

        const context = await ensureGuildContext(interaction);
        if (!context) return;

        await updatePanelMessage(interaction, context);
    },
});

createResponder({
    customId: "painel/edit-prefix",
    types: [ResponderType.Button],
    async run(interaction) {
        if (!await ensurePanelPermission(interaction)) return;

        const context = await ensureGuildContext(interaction);
        if (!context) return;

        const guildData = await db.guilds.get(context.guildId);
        await interaction.showModal(buildPrefixModal(guildData.prefix));
    },
});

createResponder({
    customId: "painel/modal-prefix",
    types: [ResponderType.Modal],
    async run(interaction) {
        if (!await ensurePanelPermission(interaction)) return;

        const prefix = normalizePrefix(interaction.fields.getTextInputValue("value"));
        if (!prefix) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("error", "Prefixo invalido", "Use entre 1 e 5 caracteres sem espacos.")],
            });
            return;
        }

        const context = await ensureGuildContext(interaction);
        if (!context) return;

        const guildData = await db.guilds.get(context.guildId);
        guildData.set("prefix", prefix);
        await guildData.save();

        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [createNoticeEmbed("success", "Prefixo atualizado", `Novo prefixo: \`${prefix}\`.`)],
        });
    },
});

createResponder({
    customId: "painel/edit-watching",
    types: [ResponderType.Button],
    async run(interaction) {
        if (!await ensurePanelPermission(interaction)) return;

        const context = await ensureGuildContext(interaction);
        if (!context) return;

        const guildData = await db.guilds.get(context.guildId);
        await interaction.showModal(buildWatchingModal(guildData.presence?.watching));
    },
});

createResponder({
    customId: "painel/modal-watching",
    types: [ResponderType.Modal],
    async run(interaction) {
        if (!await ensurePanelPermission(interaction)) return;

        const watchingText = normalizeWatching(interaction.fields.getTextInputValue("value"));
        if (!watchingText) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("error", "Texto invalido", "Use de 1 a 100 caracteres para o assistindo.")],
            });
            return;
        }

        const context = await ensureGuildContext(interaction);
        if (!context) return;

        const guildData = await db.guilds.get(context.guildId);
        guildData.set("presence.watching", watchingText);
        await guildData.save();

        interaction.client.user.setActivity(watchingText, { type: ActivityType.Watching });
        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [createNoticeEmbed("success", "Assistindo atualizado", `Agora estou assistindo **${watchingText}**.`)],
        });
    },
});

createResponder({
    customId: "painel/clear-watching",
    types: [ResponderType.Button],
    async run(interaction) {
        if (!await ensurePanelPermission(interaction)) return;

        const context = await ensureGuildContext(interaction);
        if (!context) return;

        const guildData = await db.guilds.get(context.guildId);
        guildData.set("presence", {});
        await guildData.save();

        interaction.client.user.setPresence({
            activities: [],
            status: "online",
        });

        await updatePanelMessage(interaction, context);
    },
});

createResponder({
    customId: "painel/edit-streamer-image",
    types: [ResponderType.Button],
    async run(interaction) {
        if (!await ensurePanelPermission(interaction)) return;

        const context = await ensureGuildContext(interaction);
        if (!context) return;

        const streamerConfig = await db.streamerConfigs.get(context.guildId);
        await interaction.showModal(buildStreamerImageModal(streamerConfig.panelImage));
    },
});

createResponder({
    customId: "painel/modal-streamer-image",
    types: [ResponderType.Modal],
    async run(interaction) {
        if (!await ensurePanelPermission(interaction)) return;

        const context = await ensureGuildContext(interaction);
        if (!context) return;

        const value = interaction.fields.getTextInputValue("value").trim();
        const streamerConfig = await db.streamerConfigs.get(context.guildId);

        if (["remover", "remove", "off", "desativar", "desligar"].includes(value.toLowerCase())) {
            streamerConfig.set("panelImage", undefined);
            await streamerConfig.save();
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("success", "Imagem removida", "A imagem do painel streamer foi removida.")],
            });
            return;
        }

        const imageUrl = normalizeImageUrl(value);
        if (!imageUrl) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("error", "URL invalida", "Informe uma URL valida ou use `remover`.")],
            });
            return;
        }

        streamerConfig.set("panelImage", imageUrl);
        await streamerConfig.save();
        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [createNoticeEmbed("success", "Imagem atualizada", "Imagem do painel streamer atualizada com sucesso.")],
        });
    },
});

createResponder({
    customId: "painel/clear-streamer-image",
    types: [ResponderType.Button],
    async run(interaction) {
        if (!await ensurePanelPermission(interaction)) return;

        const context = await ensureGuildContext(interaction);
        if (!context) return;

        const streamerConfig = await db.streamerConfigs.get(context.guildId);
        streamerConfig.set("panelImage", undefined);
        await streamerConfig.save();

        await updatePanelMessage(interaction, context);
    },
});

createResponder({
    customId: "painel/select-reset",
    types: [ResponderType.StringSelect],
    async run(interaction) {
        if (!await ensurePanelPermission(interaction)) return;

        const target = interaction.values[0];
        if (!isResetSettingKey(target) && !isStreamerResetSettingKey(target)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                embeds: [createNoticeEmbed("error", "Alvo invalido", "Selecione um item valido para resetar.")],
            });
            return;
        }

        const context = await ensureGuildContext(interaction);
        if (!context) return;

        const guildData = await db.guilds.get(context.guildId);
        const streamerConfig = await db.streamerConfigs.get(context.guildId);
        if (target === "prefix" || target === "all") guildData.set("prefix", ";");
        if (target === "channels" || target === "all") guildData.set("channels", {});
        if (target === "roles" || target === "all") guildData.set("roles", {});
        if (target === "modules" || target === "all") {
            guildData.set("modules", {
                economy: false,
                blacklist: false,
                counter: false,
            });
        }
        if (target === "presence" || target === "all") {
            guildData.set("presence", {});
            interaction.client.user.setPresence({
                activities: [],
                status: "online",
            });
        }
        if (target === "blacklist" || target === "all") guildData.set("blacklist", []);
        if (target === "streamerChannels") streamerConfig.set("channels", {});
        if (target === "streamerRoles") streamerConfig.set("roles", {});
        if (target === "streamerImage") streamerConfig.set("panelImage", undefined);

        await Promise.all([guildData.save(), streamerConfig.save()]);
        await updatePanelMessage(interaction, context);
    },
});

createResponder({
    customId: "painel/help",
    types: [ResponderType.Button],
    async run(interaction) {
        if (!await ensurePanelPermission(interaction)) return;

        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [
                createNoticeEmbed(
                    "info",
                    "Ajuda rapida",
                    [
                        "Use os menus de canais e cargos para configurar o bot e o sistema de streamers.",
                        "Use os botoes para editar prefixo, assistindo e imagem do painel streamer.",
                        "Use os seletores de reset para limpar configuracoes sem comando extra.",
                    ].join("\n"),
                ),
            ],
        });
    },
});
