import { createCommand } from "#base";
import { db } from "#database";
import { canManageBlacklist } from "#functions";
import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder } from "discord.js";

const blacklist = createCommand({
    name: "blacklist",
    description: "Gerencia a blacklist do servidor",
    type: ApplicationCommandType.ChatInput,
    dmPermission: false,
    async run(interaction) {
        return await db.guilds.get(interaction.guildId);
    },
});

blacklist.subcommand({
    name: "adicionar",
    description: "Adiciona um usuario na blacklist",
    options: [
        {
            name: "usuario",
            description: "Usuario que sera bloqueado",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
    ],
    async run(interaction, guildData) {
        if (!canManageBlacklist(interaction.member, guildData)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Voce nao tem permissao para gerenciar a blacklist.",
            });
            return;
        }

        const user = interaction.options.getUser("usuario", true);
        const current = new Set(guildData.blacklist ?? []);

        if (current.has(user.id)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Esse usuario ja esta na blacklist.",
            });
            return;
        }

        current.add(user.id);
        guildData.set("blacklist", [...current]);
        await guildData.save();

        await interaction.reply({
            flags: ["Ephemeral"],
            content: `<@${user.id}> foi adicionado(a) na blacklist.`,
        });
    },
});

blacklist.subcommand({
    name: "remover",
    description: "Remove um usuario da blacklist",
    options: [
        {
            name: "usuario",
            description: "Usuario que sera desbloqueado",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
    ],
    async run(interaction, guildData) {
        if (!canManageBlacklist(interaction.member, guildData)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Voce nao tem permissao para gerenciar a blacklist.",
            });
            return;
        }

        const user = interaction.options.getUser("usuario", true);
        const current = new Set(guildData.blacklist ?? []);

        if (!current.has(user.id)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Esse usuario nao esta na blacklist.",
            });
            return;
        }

        current.delete(user.id);
        guildData.set("blacklist", [...current]);
        await guildData.save();

        await interaction.reply({
            flags: ["Ephemeral"],
            content: `<@${user.id}> foi removido(a) da blacklist.`,
        });
    },
});

blacklist.subcommand({
    name: "listar",
    description: "Lista os usuarios em blacklist",
    async run(interaction, guildData) {
        if (!canManageBlacklist(interaction.member, guildData)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Voce nao tem permissao para gerenciar a blacklist.",
            });
            return;
        }

        const users = guildData.blacklist ?? [];

        if (users.length === 0) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Nao ha usuarios na blacklist.",
            });
            return;
        }

        const lines = users.slice(0, 50).map((id: string) => `- <@${id}> (\`${id}\`)`);
        const hasMore = users.length > 50;

        const embed = new EmbedBuilder()
            .setColor("#ED4245")
            .setTitle("Usuarios em blacklist")
            .setDescription(`${lines.join("\n")}${hasMore ? "\n- ...lista truncada" : ""}`)
            .setFooter({ text: `Total: ${users.length}` });

        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [embed],
        });
    },
});
