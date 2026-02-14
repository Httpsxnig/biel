import { createEvent } from "#base";
import { db } from "#database";
import {
    clearStreamerPanelImageUpload,
    createNoticeEmbed,
    getFirstImageAttachmentUrl,
    getStreamerPanelImageUpload,
} from "#functions";

createEvent({
    name: "Panel streamer image upload",
    event: "messageCreate",
    async run(message) {
        if (message.author.bot || !message.guildId) return;

        const pending = getStreamerPanelImageUpload(message.author.id);
        if (!pending) return;
        if (pending.guildId !== message.guildId || pending.channelId !== message.channelId) return;

        const content = message.content.trim().toLowerCase();
        if (["cancelar", "cancel", "cancelar imagem"].includes(content)) {
            clearStreamerPanelImageUpload(message.author.id);
            await message.reply({
                embeds: [createNoticeEmbed("warning", "Envio cancelado", "A atualizacao da imagem foi cancelada.")],
            }).catch(() => null);
            return;
        }

        const imageUrl = getFirstImageAttachmentUrl(message.attachments.values());
        if (!imageUrl) {
            await message.reply({
                embeds: [
                    createNoticeEmbed(
                        "error",
                        "Arquivo invalido",
                        "Envie uma imagem valida (png, jpg, jpeg, webp, gif ou bmp).",
                    ),
                ],
            }).catch(() => null);
            return;
        }

        try {
            const streamerConfig = await db.streamerConfigs.get(message.guildId);
            if (streamerConfig.panelImage === imageUrl) {
                clearStreamerPanelImageUpload(message.author.id);
                await message.reply({
                    embeds: [createNoticeEmbed("info", "Imagem mantida", "Essa imagem ja esta configurada no painel streamer.")],
                }).catch(() => null);
                return;
            }

            streamerConfig.set("panelImage", imageUrl);
            await streamerConfig.save();
            clearStreamerPanelImageUpload(message.author.id);

            await message.reply({
                embeds: [createNoticeEmbed("success", "Imagem atualizada", "Imagem do painel streamer salva com sucesso.")],
            }).catch(() => null);
        } catch {
            await message.reply({
                embeds: [createNoticeEmbed("error", "Falha ao salvar", "Nao consegui salvar a imagem. Tente novamente.")],
            }).catch(() => null);
        }
    },
});
