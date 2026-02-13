import { createEvent } from "#base";
import { processStreamerFormMessage } from "../responders/streamers.js";

createEvent({
    name: "Streamers DM form flow",
    event: "messageCreate",
    async run(message) {
        await processStreamerFormMessage(message);
    },
});
