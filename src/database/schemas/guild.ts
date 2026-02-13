import { Schema } from "mongoose";
import { t } from "../utils.js";

export const guildSchema = new Schema(
    {
        id: t.string,
        prefix: { type: String, default: ";" },
        channels: {
            logs: String,
            general: String,
            counter: String,
            economy: String,
        },
        roles: {
            economy: String,
            blacklistManager: String,
        },
        modules: {
            economy: { type: Boolean, default: false },
            blacklist: { type: Boolean, default: false },
            counter: { type: Boolean, default: false },
        },
        presence: {
            watching: String,
        },
        blacklist: { type: [String], default: [] },
    },
    {
        statics: {
            async get(id: string) {
                return await this.findOne({ id }) ?? this.create({ id });
            }
        }
    }
);
