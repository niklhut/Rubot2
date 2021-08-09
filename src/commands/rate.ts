import { Interaction, MessageEmbed } from "discord.js";
import { Command, RunCommand } from "../../typings";

/**
 * The Command Definition
 */
const command: Command = {
    name: 'rate',
    aliases: ['judge', 'evaluate', 'r8'],
    usage: '<anything to rate>',
    invisible: true,
    guildOnly: false,
    description: 'Judges your stupid stuff as x/10 (11/10 is possible)',
    category: "Fun",
    options: [{
        name: 'query',
        description: 'The Thing to Rate',
        type: "STRING",
        required: false,
    }],
    async execute(client, interaction, args) {
        /**
         * The Possible Answers that get returned with weights to the Categories
         * @type {[String[],Number]}
         */
        var Answers: [string, number][] = [['normal', 98], ['insanely good', 1], ['insanely bad', 1]];
        var shuffeled1 = client.utils.general.getRandomEntryWithWeights(Answers);
        let chosennumber;
        switch (shuffeled1) {
            case "insanely good":
                chosennumber = client.utils.general.getRandomInt(11, 12);
                break;
            case "insanely bad":
                chosennumber = -1;
                break;
            default:
                chosennumber = client.utils.general.getRandomInt(0, 10);
                break;
        }
        var customtext = "";
        let query = (interaction instanceof Interaction) ? interaction.options.getString("query", false) : args.join(" ");
        /**
         * some rng manipulation ;)
         */
        switch (query) {
            case "apple":
            case "Apple":
                chosennumber = 0;
                break;
            case "arch":
            case "Arch":
                chosennumber = 11;
                customtext = `- I use Arch btw. ${client.emojis.cache.get("771750143526436894")}`
                break;
        }
        // await message.reply(`I rate \`${chosennumber}/10\``);
        await client.utils.embeds.SimpleEmbed(interaction!, `__Rating System__`, `${interaction instanceof Interaction && query ? "> " + query + "\n" : ""}I rate \`${chosennumber}/10\`${customtext}`);
    },
};

/**
 * Exporting the Command using CommonJS
 */
module.exports = command;