import "./constants.js";
import { validateEnv } from "@constatic/base";
import { z } from "zod";

export const env = await validateEnv(z.looseObject({
    BOT_TOKEN: z.string("Discord Bot Token is required").min(1),
    WEBHOOK_LOGS_URL: z.url().optional(),
    GUILD_ID: z.string().optional(),
    MONGO_URI: z.string("MongoDb URI is required").min(1),
    DATABASE_NAME: z.string().optional() ,
    SERVER_PORT: z.string().optional(),
    SERVER_BASE_URL: z.string().optional() ,
    CLIENT_SECRET: z.string().optional()

}));