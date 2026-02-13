import { createCommand } from "#base";
import { db } from "#database";
import { canManageEconomy, isBlacklisted } from "#functions";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";

const coins = createCommand({
    name: "coins",
    description: "Gerencia moedas de usuarios",
    type: ApplicationCommandType.ChatInput,
    dmPermission: false,
    async run(interaction) {
        const guildData = await db.guilds.get(interaction.guildId);
        if (isBlacklisted(guildData, interaction.user.id)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Voce esta na blacklist deste servidor e nao pode usar comandos.",
            });
            this.block();
        }
        return guildData;
    },
});

coins.subcommand({
    name: "adicionar",
    description: "Adiciona moedas para um usuario",
    options: [
        {
            name: "usuario",
            description: "Usuario que recebera as moedas",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "quantidade",
            description: "Quantidade de moedas",
            type: ApplicationCommandOptionType.Integer,
            required: true,
            minValue: 1,
        },
    ],
    async run(interaction, guildData) {
        if (!guildData.modules?.economy) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Modulo de economia desativado.",
            });
            return;
        }

        if (!canManageEconomy(interaction.member, guildData)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Voce nao tem permissao para alterar moedas.",
            });
            return;
        }

        const user = interaction.options.getUser("usuario", true);
        const amount = interaction.options.getInteger("quantidade", true);

        const memberData = await db.members.get({
            id: user.id,
            guild: { id: interaction.guildId },
        });

        const newBalance = (memberData.wallet?.coins ?? 0) + amount;
        memberData.set("wallet.coins", newBalance);
        await memberData.save();

        await interaction.reply({
            flags: ["Ephemeral"],
            content: `${amount} moeda(s) adicionadas para <@${user.id}>. Novo saldo: ${newBalance}.`,
        });
    },
});

coins.subcommand({
    name: "remover",
    description: "Remove moedas de um usuario",
    options: [
        {
            name: "usuario",
            description: "Usuario que tera as moedas removidas",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "quantidade",
            description: "Quantidade de moedas",
            type: ApplicationCommandOptionType.Integer,
            required: true,
            minValue: 1,
        },
    ],
    async run(interaction, guildData) {
        if (!guildData.modules?.economy) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Modulo de economia desativado.",
            });
            return;
        }

        if (!canManageEconomy(interaction.member, guildData)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Voce nao tem permissao para alterar moedas.",
            });
            return;
        }

        const user = interaction.options.getUser("usuario", true);
        const amount = interaction.options.getInteger("quantidade", true);

        const memberData = await db.members.get({
            id: user.id,
            guild: { id: interaction.guildId },
        });

        const newBalance = Math.max(0, (memberData.wallet?.coins ?? 0) - amount);
        memberData.set("wallet.coins", newBalance);
        await memberData.save();

        await interaction.reply({
            flags: ["Ephemeral"],
            content: `${amount} moeda(s) removidas de <@${user.id}>. Novo saldo: ${newBalance}.`,
        });
    },
});

coins.subcommand({
    name: "definir",
    description: "Define o saldo de moedas de um usuario",
    options: [
        {
            name: "usuario",
            description: "Usuario que tera o saldo definido",
            type: ApplicationCommandOptionType.User,
            required: true,
        },
        {
            name: "quantidade",
            description: "Saldo final",
            type: ApplicationCommandOptionType.Integer,
            required: true,
            minValue: 0,
        },
    ],
    async run(interaction, guildData) {
        if (!guildData.modules?.economy) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Modulo de economia desativado.",
            });
            return;
        }

        if (!canManageEconomy(interaction.member, guildData)) {
            await interaction.reply({
                flags: ["Ephemeral"],
                content: "Voce nao tem permissao para alterar moedas.",
            });
            return;
        }

        const user = interaction.options.getUser("usuario", true);
        const amount = interaction.options.getInteger("quantidade", true);

        const memberData = await db.members.get({
            id: user.id,
            guild: { id: interaction.guildId },
        });

        memberData.set("wallet.coins", amount);
        await memberData.save();

        await interaction.reply({
            flags: ["Ephemeral"],
            content: `Saldo de <@${user.id}> definido para ${amount} moeda(s).`,
        });
    },
});
