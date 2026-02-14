import { Schema } from "mongoose";
import { t } from "../utils.js";

export const streamerConfigSchema = new Schema(
    {
        guildId: t.string,
        channels: {
            applications: String,
            requirements: String,
            benefits: String,
            approvedLogs: String,
        },
        roles: {
            influencer: String,
            creator: String,
            tier1: String,
            tier2: String,
            tier3: String,
            tier4: String,
        },
        panelImage: String,
        footer: { type: String, default: "Sistema de Streamers" },
    },
    {
        statics: {
            async get(guildId: string) {
                return await this.findOne({ guildId }) ?? this.create({ guildId });
            }
        }
    }
);
