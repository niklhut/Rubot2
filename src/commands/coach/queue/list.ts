import { Message } from "discord.js";
import path from "path";
import { Command } from "../../../../typings";

const command: Command = {
    name: "list",
    description: "Lists The first X entries of the Coaching Queue (default: 5)",
    aliases: ["s", "begin", "b"],
    options: [{
        name: "amount",
        description: "The Amount of Entries to display (this option will soon be replaced with navigation buttons)",
        type: "INTEGER",
        required: false,
    }],
    execute: async (client, interaction, args) => {
        if (!interaction) {
            return;
        }
        if (interaction instanceof Message) {
            client.utils.embeds.SimpleEmbed(interaction, "Slash Only Command", "This Command is Slash only but you Called it with The Prefix. use the slash Command instead.");
            return;
        }

        const g = interaction.guild!;

        client.utils.embeds.SimpleEmbed(interaction, "TODO", `Command \`${path.relative(process.cwd(), __filename)}\` is not Implemented Yet.`);
    },
};

/**
 * Exporting the Command using CommonJS
 */
module.exports = command;