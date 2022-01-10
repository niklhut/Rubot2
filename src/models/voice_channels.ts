/* eslint-disable @typescript-eslint/no-empty-interface */
import mongoose from "mongoose";
import { Bot } from "../bot";
import { Channel } from "./text_channels";
import VoiceChannelSpawnerSchema, { VoiceChannelSpawner, VoiceChannelSpawnerDocument } from "./voice_channel_spawner";
import * as djs from "discord.js";

export interface VoiceChannel extends Channel {
    /**
     * The Channel ID
     */
    _id: string,
    /**
     * If the channel is an AFK-Hell (constantly plays a Song)
     */
    afkhell?: boolean,
    /**
     * The Song Link for AFK Hell
     */
    song_link?: string,
    /**
     * If the voice Channel is locked to a specific user group (used to keep track of lock icon)
     */
    locked: boolean,
    /**
     * The Permitted Users/Roles that can enter this channel
     */
    permitted: string[],
    /**
     * Makes the Channel a spawner Channel which creates a new channel for every joined member
     */
    spawner?: VoiceChannelSpawner,
    /**
     * The Channel Prefix
     */
    prefix?: string,
    /**
     * A Queue that is entered with joining this Channel
     */
    queue?: mongoose.Types.ObjectId,
    /**
     * If the VC is a Temporary Voice Channel
     */
    temporary?: boolean,
    /**
     * The Channel Supervisor Roles/ User IDs
     */
    supervisors?: string[],
}

const VoiceChannelSchema = new mongoose.Schema<VoiceChannelDocument, VoiceChannelModel, VoiceChannel>({
    _id: {
        type: String,
        required: true,
    },
    channel_type: {
        type: Number,
        enum: [0, 1, 2, 3, 4, 5, 6, 7],
        required: true,
    },
    managed: {
        type: Boolean,
        required: true,
    },
    owner: {
        type: String,
        required: false,
    },
    prefix: {
        type: String,
        required: false,
    },
    category: {
        type: String,
        required: false,
    },
    afkhell: {
        type: Boolean,
        required: false,
    },
    song_link: {
        type: String,
        required: false,
    },
    locked: {
        type: Boolean,
        required: true,
        default: false,
    },
    permitted: [{
        type: String,
        required: true,
        default: [],
    }],
    spawner: {
        type: VoiceChannelSpawnerSchema,
        required: false,
    },
    queue: {
        type: mongoose.Types.ObjectId,
        required: false,
    },
    temporary: {
        type: Boolean,
        required: false,
        default: false,
    },
    supervisors: [{
        type: String,
        required: false,
        default: [],
    }],
});

export interface VoiceChannelDocument extends VoiceChannel, Omit<mongoose.Document, "_id"> {
    permitted: mongoose.Types.Array<string>,
    spawner?: VoiceChannelSpawnerDocument,
    supervisors?: mongoose.Types.Array<string>,
    /**
     * Locks the Voice Channel
     */
    lock(channel: djs.VoiceChannel, roleId?: string | undefined): Promise<void>;
    /**
     * Unlocks the Voice Channel
     */
    unlock(channel: djs.VoiceChannel, roleId?: string | undefined): Promise<void>;
    /**
     * Locks or Unlocks the Voice Channel (opposite State).
     */
    toggleLock(channel: djs.VoiceChannel, roleId?: string | undefined): Promise<void>;
}

export interface VoiceChannelModel extends mongoose.Model<VoiceChannelDocument> {

}

VoiceChannelSchema.method("lock", async function (channel: djs.VoiceChannel, roleId?: djs.Snowflake) {
    await channel.permissionOverwrites.edit(roleId ?? channel.guild.roles.everyone.id, { "CONNECT": false, "SPEAK": false });
    this.locked = true;
    await this.$parent()?.save();
});

VoiceChannelSchema.method("unlock", async function (channel: djs.VoiceChannel, roleId?: djs.Snowflake) {
    await channel.permissionOverwrites.edit(roleId ?? channel.guild.roles.everyone.id, { "VIEW_CHANNEL": true, "CONNECT": true, "SPEAK": !this.queue });
    this.locked = false;
    await this.$parent()?.save();
});

VoiceChannelSchema.method("toggleLock", async function (channel: djs.VoiceChannel, roleId?: djs.Snowflake) {
    this.locked ? await this.lock(channel, roleId) : await this.unlock(channel, roleId);
    await this.$parent()?.save();
});

// Default export
export default VoiceChannelSchema;