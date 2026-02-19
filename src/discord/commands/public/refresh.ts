import { createCommand } from "#base";
import { env } from "#env";
import { createNoticeEmbed } from "#functions";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ApplicationCommandType } from "discord.js";

createCommand({
    name: "refresh",
    description: "Reinicia a conexao do bot sem fechar o processo",
    type: ApplicationCommandType.ChatInput,
    dmPermission: false,
    async run(interaction) {
        await interaction.deferReply({ flags: ["Ephemeral"] }).catch(() => null);

        const ownerId = env.OWNER_DISCORD_ID?.trim();
        if (!ownerId) {
            await interaction.editReply({
                embeds: [createNoticeEmbed("error", "Configuracao ausente", "Defina `OWNER_DISCORD_ID` para usar /refresh.")],
            });
            return;
        }

        if (interaction.user.id !== ownerId) {
            await interaction.editReply({
                embeds: [createNoticeEmbed("error", "Sem permissao", "Apenas o dono configurado pode usar /refresh.")],
            });
            return;
        }

        await interaction.editReply({
            embeds: [createNoticeEmbed("info", "Refresh", "Executando build do bot...")],
        });

        const buildResult = await runProcess("npm", ["run", "build"]);
        if (!buildResult.ok) {
            await interaction.editReply({
                embeds: [
                    createNoticeEmbed(
                        "error",
                        "Build falhou",
                        [
                            "O bot nao foi reiniciado porque o build falhou.",
                            buildResult.output ? `\`\`\`\n${trimOutput(buildResult.output)}\n\`\`\`` : null,
                        ].filter(Boolean).join("\n\n"),
                    ),
                ],
            });
            return;
        }

        await interaction.editReply({
            embeds: [
                createNoticeEmbed(
                    "success",
                    "Build concluido",
                    "Iniciando novo processo (`npm run start`) e encerrando o atual...",
                ),
            ],
        });

        const refreshFlagPath = resolve(process.cwd(), ".refresh-restart.flag");
        try {
            writeFileSync(refreshFlagPath, `${Date.now()}`);
        } catch (error) {
            console.error("[refresh] falha ao criar flag de reinicio:", error);
        }

        const startChild = spawn("npm", ["run", "start"], {
            cwd: process.cwd(),
            detached: true,
            shell: true,
            stdio: "ignore",
            env: process.env,
        });
        startChild.unref();

        setTimeout(async () => {
            await interaction.client.destroy().catch(() => null);
            process.exit(0);
        }, 1500);
    },
});

async function runProcess(command: string, args: string[]) {
    return new Promise<{ ok: boolean; output: string; }>((resolve) => {
        let output = "";
        const child = spawn(command, args, {
            cwd: process.cwd(),
            shell: true,
            env: process.env,
        });

        child.stdout?.on("data", (chunk) => {
            output += chunk.toString();
        });
        child.stderr?.on("data", (chunk) => {
            output += chunk.toString();
        });

        child.on("close", (code) => {
            resolve({ ok: code === 0, output });
        });
        child.on("error", () => {
            resolve({ ok: false, output });
        });
    });
}

function trimOutput(text: string) {
    const normalized = text.trim();
    if (normalized.length <= 1500) return normalized;
    return `...${normalized.slice(-1500)}`;
}
