import { ExecuteEvent } from "../../typings";
import { Collection, Guild, GuildMember, Message } from "discord.js";
export const name = "messageCreate";
import { dm_only_verify, dm_verify_guild, verify_secret } from "../../config.json";
import * as crypto from "crypto";
import UserSchema from "../models/users";

export const execute: ExecuteEvent<"messageCreate"> = async (client, message) => {
    if (message.partial) {
        message = await message.fetch();
    }
    if (message.author.id === client.user?.id) {
        return;
    }
    if (!message.guild && dm_only_verify) {
        console.log(`Verifying User ${message.author.tag} with message: ${message.cleanContent}`);
        if (!(message instanceof Message)) {
            return;
        }
        const token = message.content.trim();
        const rauteSplit = token.split("#");
        if (rauteSplit.length != 2) {
            console.log(`Failed Verifying User ${message.author.tag} with message: Invalid Token String.`);
            return await client.utils.embeds.SimpleEmbed(message, { title: "Verification System Error", text: "Invalid Token String.", empheral: true });

        }
        const [other_infos, hmac] = rauteSplit;

        // HMAC bilden
        const expected_hmac = crypto.createHmac("sha256", verify_secret)
            .update(other_infos)
            .digest("hex");

        const buffer1 = Buffer.from(hmac);
        const buffer2 = Buffer.from(expected_hmac);


        if (buffer1.length != buffer2.length || !crypto.timingSafeEqual(buffer1, buffer2)) {
            console.log(`Failed Verifying User ${message.author.tag} with message: Invalid Token String.`);
            return await client.utils.embeds.SimpleEmbed(message, { title: "Verification System Error", text: "Invalid Token String.", empheral: true });
        }

        const user = message.author;
        const guild = client.guilds.resolve(dm_verify_guild);
        if (!(guild instanceof Guild)) {
            console.log(`Failed Verifying User ${message.author.tag} with message: This should not happen... Please Contact the owner of the Bot.`);
            return await client.utils.embeds.SimpleEmbed(message, { title: "Server Not Found", text: "This should not happen... Please Contact the owner of the Bot.", empheral: true });
        }
        console.log(`${user.id}`);
        const member = guild.members.fetch(user.id);
        if (!(member instanceof GuildMember)) {
            console.log(`Failed Verifying User ${message.author.tag} with message: You are not a Member of the Guild.`);

            return await client.utils.embeds.SimpleEmbed(message, { title: "Verification System Error", text: "You are not a Member of the Guild.", empheral: true });
        }

        // Token-Format: "FOP-DiscordV1|tu-id|moodle-id#hmac"
        const [version_string, tu_id, moodle_id] = other_infos.split("|");

        let databaseUser = await UserSchema.findById(member.id);
        if (!databaseUser) {
            databaseUser = new UserSchema({ _id: member.id });
            await databaseUser.save();
        }
        databaseUser.tu_id = tu_id;
        databaseUser.moodle_id = moodle_id;

        // Check Duplicate Entry

        try {
            await databaseUser.save();
        } catch (error) {
            if ((error as any).message?.includes("duplicate key")) {
                console.log(`User ${member.displayName} tried to valid but already used token with TU-ID: "${tu_id}", Moodle-ID: "${moodle_id}"`);
                return await client.utils.embeds.SimpleEmbed(message, { title: "Verification System Error", text: "You can only Link one Discord Account.", empheral: true });
            } else {
                console.log(error);
                return await client.utils.embeds.SimpleEmbed(message, { title: "Verification System Error", text: "An Internal Error Occurred.", empheral: true });
            }
        }
        console.log(`Linked ${member.displayName} to TU-ID: "${tu_id}", Moodle-ID: "${moodle_id}"`);

        // Give Roles

        const verifiedRole = member.guild.roles.cache.find(x => x.name.toLowerCase() === "verified");
        if (!verifiedRole) {
            return await client.utils.embeds.SimpleEmbed(message, { title: "Verification System Error", text: "Verified-Role Could not be found.", empheral: true });
        }

        if (member.roles.cache.has(verifiedRole.id)) {
            return await client.utils.embeds.SimpleEmbed(message, { title: "Verification System Error", text: "Your account has already been verified.", empheral: true });
        }
        await member.roles.add(verifiedRole);



        if (version_string === "FOP-DiscordV1-Tutor") {
            const coachRole = member.guild.roles.cache.find(x => x.name.toLowerCase() === "tutor");
            if (!coachRole) {
                return await client.utils.embeds.SimpleEmbed(message, { title: "Verification System Error", text: "Coach-Role Could not be found.", empheral: true });
            }
            if (member.roles.cache.has(coachRole.id)) {
                return await client.utils.embeds.SimpleEmbed(message, { title: "Verification System Error", text: "Your already have the coach Role.", empheral: true });
            }
            await member.roles.add(coachRole);
        }

        return await client.utils.embeds.SimpleEmbed(message, { title: "Verification System", text: "Your Discord-Account has been verified.", empheral: true });
    } else {

        /**
         * The cooldowns will be stored on a per User level
         */
        const cooldowns = client.cooldowns;

        const prefix = client.prefix;

        if (message.content.toLowerCase() == `<@!${client.user!.id}> prefix`) {
            // message.reply(`The Bot Prefix is:\n\`${client.prefix}\``);
            client.utils.embeds.SimpleEmbed(message, "The Prefix for this Channel is:", client.prefix);
        }

        // no need to continue if message does not start with a Prefix
        if (!message.content.startsWith(prefix) || message.author.bot) return;

        // Prepare command for execution
        const args = message.content.slice(prefix.length).split(/ +/);
        // const flags = client.parser(message.content.slice(prefix.length));
        // const args = flags._;
        // console.log(flags);
        const commandName = (args.shift() as string).toLowerCase();
        const command = client.commands.get(commandName) || client.commands.find(cmd => (cmd.aliases != undefined) && cmd.aliases.includes(commandName));
        // if command was not found, just return to not interfere with other bots
        if (!command) return;

        if (!(await client.utils.general.hasPermission(client, message.author, command, message.guild))) {
            await client.utils.errors.errorMessage(message, `You don't have permission to execute this command, ${message.author}!`);
            return;
        }

        if (command.guildOnly && !message.guild) {
            await client.utils.errors.errorMessage(message, "I can't execute that command inside DMs!");
            return;
        }

        if (command.args && !args.length) {
            let reply = `You didn't provide any arguments, ${message.author}!`;

            if (command.usage) {
                reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
            }
            await client.utils.errors.errorMessage(message, reply);
            return;
        }

        // Check cooldowns
        if (!cooldowns.has(command.name)) {
            cooldowns.set(command.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.name)!;
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id)! + cooldownAmount;

            if (now < expirationTime && message.author.id != client.ownerID) {
                const timeLeft = (expirationTime - now) / 1000;
                await client.utils.errors.errorMessage(message, `please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command again.`);
                return;
            }
        }

        // Execute Command
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
        try {
            // let commandPromise = command.execute(client, message, args);
            // while(commandPromise instanceof Promise){
            //     commandPromise = await commandPromise
            // }
            command.execute(client, message, args);
        } catch (error) {
            console.error(error);
            message.reply(`Oh no, command ${commandName} had an error while executing :(\nI will look into this as soon as possible!`);
        }


        // if (commandName == "ping") {
        //     message.reply("Pong!");
        // }

        return;
    }
};
