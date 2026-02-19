import { Schema } from "mongoose";
import { t } from "../utils.js";

export const memberSchema = new Schema(
    {
        id: t.string,
        guildId: t.string,
        wallet: {
            coins: { type: Number, default: 0 },
        }
    },
    {
        statics: {
            async get(member: { id: string; guild: { id: string; } }) {
                const query = { id: member.id, guildId: member.guild.id };
                return this.findOneAndUpdate(
                    query,
                    { $setOnInsert: query },
                    {
                        upsert: true,
                        new: true,
                        setDefaultsOnInsert: true,
                    },
                );
            }
        }
    },
);

memberSchema.index({ guildId: 1, id: 1 }, { unique: true });
