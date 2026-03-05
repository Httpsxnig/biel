import { createCommand } from "#base";
import { env } from "#env";
import { createNoticeEmbed } from "#functions";
import { spawn } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { ApplicationCommandType } from "discord.js";

let refreshInProgress = false;

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

        if (refreshInProgress) {
            await interaction.editReply({
                embeds: [createNoticeEmbed("warning", "Refresh em andamento", "Ja existe um /refresh rodando.")],
            });
            return;
        }

        refreshInProgress = true;

        await interaction.editReply({
            embeds: [createNoticeEmbed("info", "Refresh", "Executando build do bot...")],
        });

        const buildResult = await runSafeBuild();
        if (!buildResult.ok) {
            refreshInProgress = false;
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
                    isRunningUnderPm2()
                        ? "Reiniciando processo atual para o PM2 subir com a nova build..."
                        : "Iniciando novo processo (`npm run start`) e encerrando o atual...",
                ),
            ],
        });

        if (!isRunningUnderPm2()) {
            const startChild = spawn("npm", ["run", "start"], {
                cwd: process.cwd(),
                detached: true,
                shell: true,
                stdio: "ignore",
                env: process.env,
            });
            startChild.unref();
        }

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

async function runSafeBuild() {
    const buildDir = resolve(process.cwd(), "build");
    const stagingDir = resolve(process.cwd(), "build.__next");
    const backupDir = resolve(process.cwd(), "build.__previous");

    rmSync(stagingDir, { recursive: true, force: true });
    rmSync(backupDir, { recursive: true, force: true });

    const compileResult = await runProcess("npx", ["tsc", "--outDir", "build.__next"]);
    if (!compileResult.ok) {
        rmSync(stagingDir, { recursive: true, force: true });
        return compileResult;
    }

    const stagedIndexPath = resolve(stagingDir, "index.js");
    if (!existsSync(stagedIndexPath)) {
        rmSync(stagingDir, { recursive: true, force: true });
        return {
            ok: false,
            output: [compileResult.output, "Arquivo build.__next/index.js nao foi gerado."].filter(Boolean).join("\n"),
        };
    }

    try {
        if (existsSync(buildDir)) {
            renameSync(buildDir, backupDir);
        }
        renameSync(stagingDir, buildDir);
        rmSync(backupDir, { recursive: true, force: true });
        return compileResult;
    } catch (error) {
        try {
            if (!existsSync(buildDir) && existsSync(backupDir)) {
                renameSync(backupDir, buildDir);
            }
        } catch {
            // sem acao: erro de rollback ja vai refletir no retorno
        }
        rmSync(stagingDir, { recursive: true, force: true });
        return {
            ok: false,
            output: [
                compileResult.output,
                `Falha ao trocar a pasta build: ${error instanceof Error ? error.message : String(error)}`,
            ].filter(Boolean).join("\n"),
        };
    }
}

function isRunningUnderPm2() {
    return !!process.env.pm_id || !!process.env.PM2_HOME;
}

