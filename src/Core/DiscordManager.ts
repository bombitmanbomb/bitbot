import type { BitBot } from "./BitBot";
import Discord, { Client } from "discord.js";
export class DiscordManager {
	public Bot: BitBot;
	public _discord: typeof Discord;
	public Client: Client;
	private _readyResolve!: (value: PromiseLike<boolean> | boolean) => void;
	private _readeReject!: (value: PromiseLike<boolean> | boolean) => void;
	private _readyPromise: Promise<boolean>;
	private _clientReady: Promise<boolean>;
	constructor(Bot: BitBot, intents: Discord.Intents) {
		this.Bot = Bot;
		this._discord = Discord;
		this.Client = new this._discord.Client({ intents }); //!Discord 13
		//this.Client = new this._discord.Client({fetchAllMembers:true, ws:{intents}}) //!DIscord 12
		this._clientReady = new Promise((res) => {
			this.Client.once("ready", () => {
				res(true);
			});
		});
		this._readyPromise = new Promise((res, rej) => {
			this._readyResolve = res;
			this._readeReject = rej;
		});
		this.Init()
			.then((status) => {
				this.Bot.Events.emit("ready", status);
			})
			.catch((error) => {
				console.error(error);
			});
	}
	private async Init(): Promise<unknown> {
		try {
			return this.Client.login(this.Bot.Config.Tokens.Discord).then(
				async () => {
					const presence = this.Client.user?.setPresence({
						activities: [{ name: "Everything", type: "WATCHING" }], //!Discord 13
						status: "online",
					});
					const hooks = this._clientReady.then(async () => {
						this.Client.on("guildMemberAdd", (member) => {
							this.Bot.Events.emit("guildMemberAdd", member);
						});
						this.Client.on("guildMemberRemove", (member) => {
							this.Bot.Events.emit("guildMemberRemove", member);
						});
						this.Client.on(
							"guildMemberUpdate",
							(guildMemberOld, guildMemberNew) => {
								const oldRoles = guildMemberOld.roles,
									newRoles = guildMemberNew.roles;
								const change =
									oldRoles.cache.size > newRoles.cache.size
										? { Remove: oldRoles.cache.difference(newRoles.cache) }
										: { Add: newRoles.cache.difference(oldRoles.cache) };
								if (change.Add?.size === 0) return;
								this.Bot.Events.emit(
									"discordRoleChange",
									guildMemberNew,
									change
								);
							}
						);
						this.Client.on("messageCreate", (message) => {
							this.Bot.Events.emit("messageCreate", message);
						});
						this.Client.on("messageReactionAdd", (messageReaction) => {
							this.Bot.Events.emit("messageReactionAdd", messageReaction);
						});
					});
					return await Promise.all([presence, hooks]);
				}
			);
		} catch (error) {
			this.Bot.Events.emit("error", error);
			return [false];
		}
	}
}
