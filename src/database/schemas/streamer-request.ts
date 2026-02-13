import { Schema } from "mongoose";
import { t } from "../utils.js";

export const streamerRequestSchema = new Schema({
    guildId: t.string,
    userId: t.string,
    channelId: String,
    messageId: String,
    answers: { type: Schema.Types.Mixed, default: {} },
    attachments: { type: [String], default: [] },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    selectedRoleKey: String,
    reviewedBy: String,
    reviewedAt: Date,
}, {
    timestamps: true,
});
