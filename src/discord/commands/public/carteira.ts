import { createCommand } from "#base";
import { db } from "#database";
import { canManageEconomy, isBlacklisted } from "#functions";
import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder } from "discord.js";

createCommand({
    name: "carteira",
    description: "Mostra a quantidade de moedas de um usuario",
    type: ApplicationCommandType.ChatInput,
    dmPermission: false,
    options: [
        {
            name: "usuario",
            description: "Usuario para consultar a carteira",
            type: ApplicationCommandOptionType.User,
            required: false,
        },
    ],
    async run(interaction) {
        const guildData = await db.guilds.get(interaction.guildId);
        if (isBlacklisted(guildData, interaction.user.id)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Voce esta na blacklist deste servidor e nao pode usar comandos.",
            });
            return;
        }

        if (!guildData.modules?.economy) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Modulo de economia desativado. Use /painel para ativar em Modulos.",
            });
            return;
        }

        const targetUser = interaction.options.getUser("usuario") ?? interaction.user;
        const canSeeOthers = canManageEconomy(interaction.member, guildData);

        if (targetUser.id !== interaction.user.id && !canSeeOthers) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Voce nao tem permissao para consultar a carteira de outros usuarios.",
            });
            return;
        }

        const memberData = await db.members.get({
            id: targetUser.id,
            guild: { id: interaction.guildId },
        });

        const embed = new EmbedBuilder()
            .setColor("#45ddc0")
            .setTitle(`Carteira de ${targetUser.username}`)
            .setDescription(`Saldo atual: **${memberData.wallet?.coins ?? 0} moeda(s)**.`);

        await interaction.reply({
            flags: ["Ephemeral"],
            embeds: [embed],
        });
    },
});
