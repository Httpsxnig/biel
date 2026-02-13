import mongoose, { InferSchemaType, model } from "mongoose";
import { guildSchema } from "./schemas/guild.js";
import { memberSchema } from "./schemas/member.js";
import { streamerConfigSchema } from "./schemas/streamer-config.js";
import { streamerRequestSchema } from "./schemas/streamer-request.js";
import { env } from "#env";
import chalk from "chalk";

try {
   console.log(chalk.blue("Connecting to MongoDB..."));
   await mongoose.connect(env.MONGO_URI, { 
      dbName: env.DATABASE_NAME || "database" 
   });
   console.log(chalk.green("MongoDB connected"));
} catch(err){
   console.error(err);
   process.exit(1);
}

export const db = {
   guilds: model("guild", guildSchema, "guilds"),
   members: model("member", memberSchema, "members"),
   streamerConfigs: model("streamer-config", streamerConfigSchema, "streamer_configs"),
   streamerRequests: model("streamer-request", streamerRequestSchema, "streamer_requests"),
};

export type GuildSchema = InferSchemaType<typeof guildSchema>;
export type MemberSchema = InferSchemaType<typeof memberSchema>;
export type StreamerConfigSchema = InferSchemaType<typeof streamerConfigSchema>;
export type StreamerRequestSchema = InferSchemaType<typeof streamerRequestSchema>;
