import { createEvent } from "#base";
import { db } from "#database";
import { env } from "#env";
import { ActivityType } from "discord.js";

createEvent({
    name: "Restore watching activity",
    event: "ready",
    async run(client) {
        const preferredGuildId = env.GUILD_ID?.trim();
        const preferredGuildData = preferredGuildId
            ? await db.guilds.findOne({ id: preferredGuildId })
            : null;
        const preferredText = preferredGuildData?.presence?.watching?.trim();

        const fallbackGuildData = preferredText
            ? null
            : await db.guilds.findOne({ "presence.watching": { $exists: true, $ne: "" } });
        const watchingText = preferredText || fallbackGuildData?.presence?.watching?.trim();

        if (!watchingText) return;
        client.user.setActivity(watchingText, { type: ActivityType.Watching });
    },
});
