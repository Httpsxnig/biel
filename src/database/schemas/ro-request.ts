import { Schema } from "mongoose";
import { t } from "../utils.js";

export const roRequestSchema = new Schema({
    guildId: t.string,
    userId: t.string,
    channelId: t.string,
    messageId: t.string,
    orgPm: t.string,
    fac: t.string,
    motivo: t.string,
    clipUrl: String,
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    reviewedBy: String,
    reviewedAt: Date,
}, {
    timestamps: true,
});

roRequestSchema.index({ guildId: 1, messageId: 1 });
roRequestSchema.index({ createdAt: 1 });
roRequestSchema.index({ guildId: 1, status: 1, createdAt: -1 });
