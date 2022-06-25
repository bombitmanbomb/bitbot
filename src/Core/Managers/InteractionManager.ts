import { Dictionary, List, Out, StringBuilder } from "@bombitmanbomb/utils";
import {
	Interaction,
	CommandInteraction,
	PermissionString,
	Permissions,
	TextChannel,
} from "discord.js";
import { BitBotCommand, ReplyHelper } from "../Interaction";
import { BBError } from "../../Error";
import type { BitBot } from "../BitBot";

export class InteractionManager {
	private Bot: BitBot;
	public command: Dictionary<string, BitBotCommand> = new Dictionary();
	constructor(Bot: BitBot) {
		this.Bot = Bot;
	}
	public interact(interactionData: Interaction) {
		if (interactionData.isCommand()) {
			const interaction = interactionData;
			interaction.deferReply({ ephemeral: true }).then(() => {
				const helper = new ReplyHelper(interaction, true, this.Bot.Logic);
				helper.acknowledged = true;
				const cmd = new Out<BitBotCommand>();

				//? Get the command

				if (this.command.TryGetValue(interaction.commandName, cmd)) {
					const cache: Record<any, any> = {};
					let command = cmd.Out;
					command
						.runPermissionValidation(interaction, cache)
						.then(async (validation) => {
							//? Is there validation
							if (!(validation.channels.length === 0)) {
								let permissionChannels: IPermissionValidator[] = [];
								for (let channelObject of validation.channels) {
									const token = channelObject.channel_token;
									const perms = new Out<List<PermissionString>>();
									const permissionObject: IPermissionValidator = {
										channel_id: channelObject.channel_id,
										permissions: [],
									};
									const cachePerms = (await (
										this.Bot.Discord.Client.guilds.cache
											.get(interaction.guildId as string)
											?.channels.cache.get(
												channelObject.channel_id
											) as TextChannel
									)
										?.fetch()
										.then((channel) =>
											channel.permissionsFor(
												this.Bot.Discord.Client.user?.id as string,
												false
											)
										)) as Readonly<Permissions>;

									if (cachePerms == null) {
										//! Something went Wrong
									}

									if (command.permissions.TryGetValue(token, perms)) {
										for (const perm of perms.Out) {
											permissionObject.permissions.push({
												perm,
												meets: cachePerms.has(perm),
											});
										}
									}
									permissionChannels.push(permissionObject);
								}

								//* Validation
								//? This can be optomised and put in the permission loop to save on execution time
								let failed: IPermissionValidator[] = [];
								permissionChannels.forEach((val) => {
									let pass = true;
									for (let perm of val.permissions)
										if (!perm.meets) pass = false;
									if (!pass) failed.push(val);
								});

								if (failed.length > 0) {
									const description = new StringBuilder();
									for (let perms of failed) {
										const section = new StringBuilder();
										section.Append(`<#${perms.channel_id}>\r\n`);
										for (let perm of perms.permissions) {
											//TODO Map to Human-Readable Permissions
											section.Append(
												`**__${perm.perm}__**: ${perm.meets ? ":white_check_mark:" : ":x:"
												}\r\n`
											);
										}
										description.Append(section.toString());
									}
									helper.reply({
										embeds: [
											{
												title: "I am missing permissions",
												description: description.toString(),
											},
										],
										ephemeral: true,
									});
									return;
								}
							}
							helper.quickReply(
								"Command Not Handled",
								"Please contact the Bot Owner"
							); // Command Mapped to Discord API but not internally,
						});
				}
			});
		} else {
			this.quickRespond(interactionData, "Command not handled");
		}
	}

	/**
	 * Build a quick response. Obeys Defference
	 */
	private quickRespond(
		interactionData: Interaction,
		title = "Something went Wrong",
		description?: string
	) {
		let interaction = interactionData as CommandInteraction;
		let response = {
			title,
			description,
			footer: {
				text: Date.now().toString(36), //? Quick and Dirty
			},
		};

		if (interaction.deferred) {
			interaction.editReply({
				embeds: [response],
			});
		} else {
			interaction.reply({
				ephemeral: true,
				embeds: [response],
			});
		}
	}

	public registerModule(command: BitBotCommand) {
		switch (command.type) {
			case "CHAT_INPUT": {
				this.command.Add(command.commandId, command); //Register Slash Command
				break;
			}
			default:
				throw new BBError.Error(
					"MODULE_TYPE_INVALID",
					command.type,
					command.commandId
				);
		}
	}

	/**
	 * Sync Commands with Discord API
	 */
	public async cloudUpdate() {
		let commands:any[] = [];
		for (let obj of this.command) commands.push(obj.Value.command);
		return this.Bot.Discord.Client.application?.commands.set(commands); //! Can be Improved
	}
}

export interface IPermissionValidator {
	channel_id: string;
	permissions: { perm: string; meets: boolean }[];
}
