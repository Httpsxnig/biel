import { EmbedBuilder, type ColorResolvable } from "discord.js";

export type NoticeTone = "info" | "success" | "error" | "warning";

const tonePalette: Record<NoticeTone, { color: ColorResolvable; prefix: string }> = {
    info: { color: "#3b82f6", prefix: "INFO" },
    success: { color: "#22c55e", prefix: "OK" },
    error: { color: "#ef4444", prefix: "ERRO" },
    warning: { color: "#f59e0b", prefix: "ALERTA" },
};

export function createNoticeEmbed(tone: NoticeTone, title: string, description: string) {
    const palette = tonePalette[tone];

    return new EmbedBuilder()
        .setColor(palette.color)
        .setTitle(`${palette.prefix} | ${title}`)
        .setDescription(description)
        .setTimestamp();
}

export function createBlacklistedEmbed() {
    return createNoticeEmbed(
        "error",
        "Acesso bloqueado",
        "Voce esta na blacklist deste servidor e nao pode usar comandos."
    );
}

export function createNoPermissionEmbed(action = "executar esta acao") {
    return createNoticeEmbed(
        "error",
        "Sem permissao",
        `Voce nao tem permissao para ${action}.`
    );
}
