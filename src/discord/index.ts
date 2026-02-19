import { setupCreators } from "@constatic/base";

const GENERIC_INTERACTION_ERROR = "Algo deu errado ao processar essa interacao. Tente novamente.";

function formatUnknownError(error: unknown) {
    if (error instanceof Error) {
        const stack = error.stack ? `\n${error.stack}` : "";
        return `${error.name}: ${error.message}${stack}`;
    }

    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

function logFrameworkError(scope: "commands" | "responders" | "events", context: string, error: unknown) {
    console.error(`[constatic/${scope}] ${context}\n${formatUnknownError(error)}`);
}

async function safeReplyError(interaction: {
    deferred?: boolean;
    replied?: boolean;
    isRepliable?: () => boolean;
    reply: (options: { flags: ["Ephemeral"]; content: string; }) => Promise<unknown>;
    followUp?: (options: { flags: ["Ephemeral"]; content: string; }) => Promise<unknown>;
}) {
    if (typeof interaction.isRepliable === "function" && !interaction.isRepliable()) return;

    const payload = { flags: ["Ephemeral"] as ["Ephemeral"], content: GENERIC_INTERACTION_ERROR };
    if (interaction.deferred || interaction.replied) {
        await interaction.followUp?.(payload).catch(() => null);
        return;
    }

    await interaction.reply(payload).catch(() => null);
}

export const { createCommand, createEvent, createResponder } = setupCreators({
    commands: {
        onError(error, interaction) {
            logFrameworkError("commands", `/${interaction.commandName}`, error);
            void safeReplyError(interaction);
        },
    },
    responders: {
        onError(error, interaction) {
            const customId = "customId" in interaction ? interaction.customId : "unknown";
            logFrameworkError("responders", customId, error);
            void safeReplyError(interaction);
        },
    },
    events: {
        onError(error, event) {
            logFrameworkError("events", event.name, error);
        },
    },
});
