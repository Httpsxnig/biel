import type { GuildSchema, StreamerConfigSchema } from "#database";
import { createContainer, createTextDisplay } from "@magicyan/discord";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelSelectMenuBuilder,
    ChannelType,
    EmbedBuilder,
    ModalBuilder,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
    type ApplicationCommandOptionAllowedChannelTypes,
    type Guild,
    type GuildMember,
    type InteractionReplyOptions,
    type InteractionUpdateOptions,
} from "discord.js";

export const channelSettingKeys = ["logs", "general", "counter", "economy"] as const;
export const roleSettingKeys = ["economy", "blacklistManager"] as const;
export const streamerChannelSettingKeys = [
    "streamerApplications",
    "streamerRequirements",
    "streamerBenefits",
    "streamerApprovedLogs",
] as const;
export const streamerRoleSettingKeys = [
    "streamerInfluencer",
    "streamerCreator",
    "streamerTier1",
    "streamerTier2",
] as const;
export const moduleSettingKeys = ["economy", "blacklist", "counter"] as const;
export const resetSettingKeys = ["prefix", "channels", "roles", "modules", "presence", "blacklist", "all"] as const;
export const streamerResetSettingKeys = ["streamerChannels", "streamerRoles", "streamerImage"] as const;
export const panelChannelSettingKeys = [...channelSettingKeys, ...streamerChannelSettingKeys] as const;
export const panelRoleSettingKeys = [...roleSettingKeys, ...streamerRoleSettingKeys] as const;

export type ChannelSettingKey = typeof channelSettingKeys[number];
export type RoleSettingKey = typeof roleSettingKeys[number];
export type StreamerChannelSettingKey = typeof streamerChannelSettingKeys[number];
export type StreamerRoleSettingKey = typeof streamerRoleSettingKeys[number];
export type PanelChannelSettingKey = typeof panelChannelSettingKeys[number];
export type PanelRoleSettingKey = typeof panelRoleSettingKeys[number];
export type ModuleSettingKey = typeof moduleSettingKeys[number];
export type ResetSettingKey = typeof resetSettingKeys[number];
export type StreamerResetSettingKey = typeof streamerResetSettingKeys[number];

export type StreamerChannelConfigKey = "applications" | "requirements" | "benefits" | "approvedLogs";
export type StreamerRoleConfigKey = "influencer" | "creator" | "tier1" | "tier2";

export const channelSettingLabels: Record<ChannelSettingKey, string> = {
    logs: "Canal de logs (mensagens)",
    general: "Canal geral",
    counter: "Canal/categoria de contador",
    economy: "Canal de economia",
};

export const roleSettingLabels: Record<RoleSettingKey, string> = {
    economy: "Cargo de economia",
    blacklistManager: "Cargo de gerencia da blacklist",
};

export const streamerChannelSettingLabels: Record<StreamerChannelSettingKey, string> = {
    streamerApplications: "Streamer: Canal de analise",
    streamerRequirements: "Streamer: Canal de requisitos",
    streamerBenefits: "Streamer: Canal de beneficios",
    streamerApprovedLogs: "Streamer: Canal de aprovados",
};

export const streamerRoleSettingLabels: Record<StreamerRoleSettingKey, string> = {
    streamerInfluencer: "Streamer: Cargo ALTA - TIER 1 - INFLUENCER",
    streamerCreator: "Streamer: Cargo ALTA - TIER 2 - CRIADOR DE CONTEUDO",
    streamerTier1: "Streamer: Cargo ALTA - TIER 3 - CCONTEUDO",
    streamerTier2: "Streamer: Cargo ALTA - TIER 4 STREAMER",
};

export const panelChannelSettingLabels: Record<PanelChannelSettingKey, string> = {
    ...channelSettingLabels,
    ...streamerChannelSettingLabels,
};

export const panelRoleSettingLabels: Record<PanelRoleSettingKey, string> = {
    ...roleSettingLabels,
    ...streamerRoleSettingLabels,
};

export const moduleSettingLabels: Record<ModuleSettingKey, string> = {
    economy: "Economia",
    blacklist: "Blacklist",
    counter: "Contador",
};

export const resetSettingLabels: Record<ResetSettingKey, string> = {
    prefix: "Prefixo",
    channels: "Canais",
    roles: "Cargos",
    modules: "Modulos",
    presence: "Assistindo",
    blacklist: "Blacklist",
    all: "Tudo",
};

export const streamerResetSettingLabels: Record<StreamerResetSettingKey, string> = {
    streamerChannels: "Streamers: canais",
    streamerRoles: "Streamers: cargos",
    streamerImage: "Streamers: imagem",
};

export const streamerChannelConfigMap: Record<StreamerChannelSettingKey, StreamerChannelConfigKey> = {
    streamerApplications: "applications",
    streamerRequirements: "requirements",
    streamerBenefits: "benefits",
    streamerApprovedLogs: "approvedLogs",
};

export const streamerRoleConfigMap: Record<StreamerRoleSettingKey, StreamerRoleConfigKey> = {
    streamerInfluencer: "influencer",
    streamerCreator: "creator",
    streamerTier1: "tier1",
    streamerTier2: "tier2",
};

export const configurableChannelTypes = [
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement,
    ChannelType.GuildForum,
    ChannelType.GuildVoice,
    ChannelType.GuildCategory,
    ChannelType.GuildStageVoice,
] as ApplicationCommandOptionAllowedChannelTypes[];

const messageChannelTypes = [
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement,
] as ApplicationCommandOptionAllowedChannelTypes[];

const counterChannelTypes = [
    ChannelType.GuildText,
    ChannelType.GuildAnnouncement,
    ChannelType.GuildCategory,
] as ApplicationCommandOptionAllowedChannelTypes[];

export function isChannelSettingKey(value: string): value is ChannelSettingKey {
    return (channelSettingKeys as readonly string[]).includes(value);
}

export function isRoleSettingKey(value: string): value is RoleSettingKey {
    return (roleSettingKeys as readonly string[]).includes(value);
}

export function isStreamerChannelSettingKey(value: string): value is StreamerChannelSettingKey {
    return (streamerChannelSettingKeys as readonly string[]).includes(value);
}

export function isStreamerRoleSettingKey(value: string): value is StreamerRoleSettingKey {
    return (streamerRoleSettingKeys as readonly string[]).includes(value);
}

export function isPanelChannelSettingKey(value: string): value is PanelChannelSettingKey {
    return (panelChannelSettingKeys as readonly string[]).includes(value);
}

export function isPanelRoleSettingKey(value: string): value is PanelRoleSettingKey {
    return (panelRoleSettingKeys as readonly string[]).includes(value);
}

export function isModuleSettingKey(value: string): value is ModuleSettingKey {
    return (moduleSettingKeys as readonly string[]).includes(value);
}

export function isResetSettingKey(value: string): value is ResetSettingKey {
    return (resetSettingKeys as readonly string[]).includes(value);
}

export function isStreamerResetSettingKey(value: string): value is StreamerResetSettingKey {
    return (streamerResetSettingKeys as readonly string[]).includes(value);
}

export function normalizePrefix(value: string): string | null {
    const prefix = value.trim();
    if (!prefix || prefix.length > 5) return null;
    return prefix;
}

export function normalizeWatching(value: string): string | null {
    const text = value.trim();
    if (!text || text.length > 100) return null;
    return text;
}

export function normalizeImageUrl(value: string): string | null {
    const text = value.trim();
    if (!text) return null;

    try {
        const url = new URL(text);
        return url.toString();
    } catch {
        return null;
    }
}

const STREAMER_PANEL_IMAGE_UPLOAD_TTL_MS = 2 * 60 * 1000;

interface PendingStreamerPanelImageUpload {
    guildId: string;
    channelId: string;
    expiresAt: number;
}

const pendingStreamerPanelImageUploads = new Map<string, PendingStreamerPanelImageUpload>();

function sweepExpiredPendingStreamerPanelImageUploads(now = Date.now()) {
    for (const [userId, pending] of pendingStreamerPanelImageUploads) {
        if (pending.expiresAt <= now) {
            pendingStreamerPanelImageUploads.delete(userId);
        }
    }
}

export function beginStreamerPanelImageUpload(userId: string, guildId: string, channelId: string) {
    sweepExpiredPendingStreamerPanelImageUploads();
    const pending: PendingStreamerPanelImageUpload = {
        guildId,
        channelId,
        expiresAt: Date.now() + STREAMER_PANEL_IMAGE_UPLOAD_TTL_MS,
    };
    pendingStreamerPanelImageUploads.set(userId, pending);
    return pending;
}

export function getStreamerPanelImageUpload(userId: string) {
    const pending = pendingStreamerPanelImageUploads.get(userId);
    if (!pending) return null;

    if (pending.expiresAt <= Date.now()) {
        pendingStreamerPanelImageUploads.delete(userId);
        return null;
    }
    return pending;
}

export function clearStreamerPanelImageUpload(userId: string) {
    pendingStreamerPanelImageUploads.delete(userId);
}

export function getFirstImageAttachmentUrl(
    attachments: Iterable<{ contentType?: string | null; name?: string | null; url: string; }>,
) {
    for (const attachment of attachments) {
        const contentType = attachment.contentType?.toLowerCase() ?? "";
        const fileName = attachment.name?.toLowerCase() ?? "";
        const isImage = contentType.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp)$/i.test(fileName);
        if (isImage) return attachment.url;
    }
    return null;
}

function formatChannel(channelId?: string | null) {
    return channelId ? `<#${channelId}>` : "`Nao definido`";
}

function formatRole(roleId?: string | null) {
    return roleId ? `<@&${roleId}>` : "`Nao definido`";
}

function formatModule(enabled?: boolean) {
    return enabled ? "`ON`" : "`OFF`";
}

function getPartialChannels(guildData: Partial<GuildSchema>) {
    return (guildData.channels ?? {}) as Partial<Record<ChannelSettingKey, string>>;
}

function getPartialRoles(guildData: Partial<GuildSchema>) {
    return (guildData.roles ?? {}) as Partial<Record<RoleSettingKey, string>>;
}

function getPartialModules(guildData: Partial<GuildSchema>) {
    return (guildData.modules ?? {}) as Partial<Record<ModuleSettingKey, boolean>>;
}

function getWatchingActivity(guildData: Partial<GuildSchema>) {
    return guildData.presence?.watching?.trim() || null;
}

function getPartialStreamerChannels(streamerConfig?: Partial<StreamerConfigSchema>) {
    return (streamerConfig?.channels ?? {}) as Partial<Record<StreamerChannelConfigKey, string>>;
}

function getPartialStreamerRoles(streamerConfig?: Partial<StreamerConfigSchema>) {
    return (streamerConfig?.roles ?? {}) as Partial<Record<StreamerRoleConfigKey, string>>;
}

function getStreamerPanelImage(streamerConfig?: Partial<StreamerConfigSchema>) {
    return streamerConfig?.panelImage?.trim() || null;
}

export function buildSettingsEmbed(
    guild: Guild,
    guildData: Partial<GuildSchema>,
    streamerConfig?: Partial<StreamerConfigSchema>,
) {
    const channels = getPartialChannels(guildData);
    const roles = getPartialRoles(guildData);
    const modules = getPartialModules(guildData);
    const streamerChannels = getPartialStreamerChannels(streamerConfig);
    const streamerRoles = getPartialStreamerRoles(streamerConfig);
    const blacklistCount = guildData.blacklist?.length ?? 0;
    const activeModules = moduleSettingKeys.filter((key) => modules[key]).length;
    const watchingActivity = getWatchingActivity(guildData);
    const streamerImage = getStreamerPanelImage(streamerConfig);

    return new EmbedBuilder()
        .setColor("#f80000")
        .setAuthor({ name: "[Painel de Configuracao]" })
        .setTitle(guild.name)
        .setThumbnail(guild.iconURL({ forceStatic: false }) ?? null)
        .setDescription([
            "Painel interativo de configuracao do bot.",
            "Use os menus e botoes abaixo para atualizar todas as configuracoes.",
        ].join("\n"))
        .addFields(
            {
                name: "Resumo",
                value: [
                    `Prefixo: \`${guildData.prefix ?? ";"}\``,
                    `Assistindo: ${watchingActivity ? `\`${watchingActivity}\`` : "`Nao definido`"}`,
                    `Modulos ativos: \`${activeModules}/${moduleSettingKeys.length}\``,
                    `Usuarios na blacklist: \`${blacklistCount}\``,
                ].join("\n"),
                inline: true,
            },
            {
                name: "Canais",
                value: channelSettingKeys
                    .map((key) => `- ${channelSettingLabels[key]}: ${formatChannel(channels[key])}`)
                    .join("\n"),
                inline: true,
            },
            {
                name: "Cargos",
                value: roleSettingKeys
                    .map((key) => `- ${roleSettingLabels[key]}: ${formatRole(roles[key])}`)
                    .join("\n"),
                inline: true,
            },
            {
                name: "Streamers | Canais",
                value: streamerChannelSettingKeys
                    .map((key) => {
                        const configKey = streamerChannelConfigMap[key];
                        return `- ${streamerChannelSettingLabels[key]}: ${formatChannel(streamerChannels[configKey])}`;
                    })
                    .join("\n"),
                inline: false,
            },
            {
                name: "Streamers | Cargos",
                value: streamerRoleSettingKeys
                    .map((key) => {
                        const configKey = streamerRoleConfigMap[key];
                        return `- ${streamerRoleSettingLabels[key]}: ${formatRole(streamerRoles[configKey])}`;
                    })
                    .join("\n"),
                inline: false,
            },
            {
                name: "Streamers | Imagem",
                value: streamerImage ?? "`Nao definida`",
                inline: false,
            },
            {
                name: "Modulos",
                value: moduleSettingKeys
                    .map((key) => `- ${moduleSettingLabels[key]}: ${formatModule(modules[key])}`)
                    .join("\n"),
                inline: false,
            }
        )
        .setFooter({ text: "Dica: use /painel para abrir o configurador." })
        .setTimestamp();
}

export function buildSettingsComponents(
    guildData: Partial<GuildSchema>,
) {
    const modules = getPartialModules(guildData);
    const watchingActivity = getWatchingActivity(guildData);

    const channelSelect = new StringSelectMenuBuilder()
        .setCustomId("painel/select-channel")
        .setPlaceholder("Configurar canais")
        .addOptions(
            panelChannelSettingKeys.map((key) => ({
                label: panelChannelSettingLabels[key],
                value: key,
                description: "Definir canal para este sistema",
            }))
        );

    const roleSelect = new StringSelectMenuBuilder()
        .setCustomId("painel/select-role")
        .setPlaceholder("Configurar cargos")
        .addOptions(
            panelRoleSettingKeys.map((key) => ({
                label: panelRoleSettingLabels[key],
                value: key,
                description: "Definir cargo para este sistema",
            }))
        );

    const toggleRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        moduleSettingKeys.map((key) =>
            new ButtonBuilder()
                .setCustomId(`painel/toggle/${key}`)
                .setStyle(modules[key] ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setLabel(`${moduleSettingLabels[key]} ${modules[key] ? "ON" : "OFF"}`)
        )
    );

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId("painel/edit-prefix")
            .setStyle(ButtonStyle.Secondary)
            .setLabel("Editar prefixo"),
        new ButtonBuilder()
            .setCustomId("painel/edit-watching")
            .setStyle(ButtonStyle.Secondary)
            .setLabel("Editar assistindo"),
        new ButtonBuilder()
            .setCustomId("painel/edit-streamer-image")
            .setStyle(ButtonStyle.Secondary)
            .setLabel("Imagem streamers"),
        new ButtonBuilder()
            .setCustomId("painel/clear-watching")
            .setStyle(ButtonStyle.Danger)
            .setLabel("Limpar assistindo")
            .setDisabled(!watchingActivity),
        new ButtonBuilder()
            .setCustomId("painel/help")
            .setStyle(ButtonStyle.Secondary)
            .setLabel("Ajuda")
    );

    const resetSelect = new StringSelectMenuBuilder()
        .setCustomId("painel/select-reset")
        .setPlaceholder("Resetar configuracao")
        .addOptions(
            [
                ...resetSettingKeys.map((key) => ({
                    label: resetSettingLabels[key],
                    value: key,
                    description: key === "all" ? "Reseta todas as configuracoes" : `Reseta ${resetSettingLabels[key].toLowerCase()}`,
                })),
                ...streamerResetSettingKeys.map((key) => ({
                    label: streamerResetSettingLabels[key],
                    value: key,
                    description: `Reseta ${streamerResetSettingLabels[key].toLowerCase()}`,
                })),
            ]
        );

    return [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(channelSelect),
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(roleSelect),
        toggleRow,
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(resetSelect),
        actionRow,
    ];
}

function buildSettingsV2PanelBase(
    guild: Guild,
    guildData: Partial<GuildSchema>,
    streamerConfig?: Partial<StreamerConfigSchema>,
) {
    const channels = getPartialChannels(guildData);
    const roles = getPartialRoles(guildData);
    const modules = getPartialModules(guildData);
    const streamerChannels = getPartialStreamerChannels(streamerConfig);
    const streamerRoles = getPartialStreamerRoles(streamerConfig);
    const streamerImage = getStreamerPanelImage(streamerConfig);
    const activeModules = moduleSettingKeys.filter((key) => modules[key]).length;
    const watchingActivity = getWatchingActivity(guildData);
    const components = buildSettingsComponents(guildData);

    const container = createContainer("#4f46e5",
        createTextDisplay([
            `## Painel de configuracao | ${guild.name}`,
            `Prefixo atual: \`${guildData.prefix ?? ";"}\``,
            `Assistindo: ${watchingActivity ? `\`${watchingActivity}\`` : "`Nao definido`"}`,
            `Modulos ativos: \`${activeModules}/${moduleSettingKeys.length}\``,
            `Blacklist: \`${guildData.blacklist?.length ?? 0}\` usuario(s)`,
        ].join("\n")),
        createTextDisplay([
            "### Canais",
            ...channelSettingKeys.map((key) => `- ${channelSettingLabels[key]}: ${formatChannel(channels[key])}`),
        ].join("\n")),
        createTextDisplay([
            "### Cargos",
            ...roleSettingKeys.map((key) => `- ${roleSettingLabels[key]}: ${formatRole(roles[key])}`),
        ].join("\n")),
        createTextDisplay([
            "### Streamers | Canais",
            ...streamerChannelSettingKeys.map((key) => {
                const configKey = streamerChannelConfigMap[key];
                return `- ${streamerChannelSettingLabels[key]}: ${formatChannel(streamerChannels[configKey])}`;
            }),
        ].join("\n")),
        createTextDisplay([
            "### Streamers | Cargos",
            ...streamerRoleSettingKeys.map((key) => {
                const configKey = streamerRoleConfigMap[key];
                return `- ${streamerRoleSettingLabels[key]}: ${formatRole(streamerRoles[configKey])}`;
            }),
            `- Imagem do painel: ${streamerImage ?? "`Nao definida`"}`,
        ].join("\n")),
        createTextDisplay([
            "### Modulos",
            ...moduleSettingKeys.map((key) => `- ${moduleSettingLabels[key]}: ${formatModule(modules[key])}`),
        ].join("\n")),
        ...components
    );
    return container;
}

export function buildSettingsV2PanelReply(
    guild: Guild,
    guildData: Partial<GuildSchema>,
    streamerConfig?: Partial<StreamerConfigSchema>,
) {
    const container = buildSettingsV2PanelBase(guild, guildData, streamerConfig);
    return ({
        flags: ["Ephemeral", "IsComponentsV2"],
        components: [container],
    } satisfies InteractionReplyOptions);
}

export function buildSettingsV2PanelUpdate(
    guild: Guild,
    guildData: Partial<GuildSchema>,
    streamerConfig?: Partial<StreamerConfigSchema>,
) {
    const container = buildSettingsV2PanelBase(guild, guildData, streamerConfig);
    return ({
        flags: ["IsComponentsV2"],
        components: [container],
    } satisfies InteractionUpdateOptions);
}

export function buildChannelPicker(key: PanelChannelSettingKey) {
    const channelTypes = key === "counter" ? counterChannelTypes : messageChannelTypes;
    return new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId(`painel/channel/${key}`)
            .setChannelTypes(channelTypes)
            .setPlaceholder(`Selecione ${panelChannelSettingLabels[key].toLowerCase()}`)
    );
}

export function buildRolePicker(key: PanelRoleSettingKey) {
    return new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId(`painel/role/${key}`)
            .setPlaceholder(`Selecione ${panelRoleSettingLabels[key].toLowerCase()}`)
    );
}

export function buildPrefixModal(currentPrefix?: string | null) {
    const input = new TextInputBuilder()
        .setCustomId("value")
        .setLabel("Prefixo (1 a 5 caracteres)")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(5);

    const prefix = currentPrefix?.trim();
    if (prefix) {
        input.setValue(prefix);
    }

    return new ModalBuilder()
        .setCustomId("painel/modal-prefix")
        .setTitle("Configurar prefixo")
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                input
            )
        );
}

export function buildWatchingModal(currentText?: string | null) {
    const input = new TextInputBuilder()
        .setCustomId("value")
        .setLabel("Texto de assistindo")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(100);

    const watchingText = currentText?.trim();
    if (watchingText) {
        input.setValue(watchingText);
    }

    return new ModalBuilder()
        .setCustomId("painel/modal-watching")
        .setTitle("Configurar assistindo")
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                input
            )
        );
}

export function buildStreamerImageModal(currentImage?: string | null) {
    const input = new TextInputBuilder()
        .setCustomId("value")
        .setLabel("URL da imagem do painel streamer")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(300);

    const image = currentImage?.trim();
    if (image) {
        input.setValue(image);
    }

    return new ModalBuilder()
        .setCustomId("painel/modal-streamer-image")
        .setTitle("Configurar imagem streamers")
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(input)
        );
}

export function canManageEconomy(member: GuildMember, guildData: Partial<GuildSchema>) {
    const economyRoleId = getPartialRoles(guildData).economy;
    return member.permissions.has("ManageGuild") || !!(economyRoleId && member.roles.cache.has(economyRoleId));
}

export function canManageBlacklist(member: GuildMember, guildData: Partial<GuildSchema>) {
    const managerRoleId = getPartialRoles(guildData).blacklistManager;
    return member.permissions.has("ManageGuild") || !!(managerRoleId && member.roles.cache.has(managerRoleId));
}

export function isBlacklisted(guildData: Partial<GuildSchema>, userId: string) {
    const blacklistEnabled = !!getPartialModules(guildData).blacklist;
    if (!blacklistEnabled) return false;
    return (guildData.blacklist ?? []).includes(userId);
}
