import { IBitBotConfig } from "../Util";
import Pm2 from "@pm2/io";
import { EventEmitter } from "events";
import { DiscordManager, InteractionManager, LogicManager } from "./Managers";
import Discord from "discord.js";
import PMX from "@pm2/io/build/main/pmx";
import { Dictionary } from "@bombitmanbomb/utils";
import { IModule } from "./Module";
import { BitBotCommand, IBitBotCommand } from "./Interaction";
import { BBError } from "../Error/BBError";
import fs from "fs";
import path from "path"
export class BitBot {
	public static Intents = Discord.Intents;
	public Config: IBitBotConfig;
	public Pm2?: typeof Pm2;
	public Events: EventEmitter;
	public Initialized: boolean;
	public Logic: LogicManager;
	public Interactions: InteractionManager;
	public Discord!: DiscordManager;
	constructor(
		$config: IBitBotConfig,
		DiscordIntents?: Discord.Intents,
		io?: PMX
	) {
		this.Config = $config;
		this.Pm2 = io;
		this.Initialized = false;
		this.Events = new EventEmitter();
		this.Logic = new LogicManager(this);
		this.Interactions = new InteractionManager(this);
		this.Setup({ DiscordIntents });
	}
	private async Setup(Options: any): Promise<void> {
		if (!(await this.SetupDiscord(Options)))
			throw this.Error("Initialization Failed", false);
		this.Initialized = true;
	}
	private async SetupDiscord(config: any): Promise<boolean> {
		this.Discord = new DiscordManager(this, config.DiscordIntents);
		this.Events.on("messageCreate", this.OnDiscordMessage.bind(this));
		this.Events.on("DiscordReact", this.OnDiscordReact.bind(this));
		this.Events.on("discordRoleChange", this.OnDiscordRoleChange.bind(this));
		this.Events.on("guildMemberRemove", this.OnDiscordMemberRemove.bind(this));
		this.Events.on("guildMemberAdd", this.OnDiscordMemberJoin.bind(this));
		return true;
	}
	private OnDiscordRoleChange(
		User: Discord.GuildMember,
		RoleChange: unknown
	): void {
		this.Logic.RunEvents("discord-role", { user: User, role: RoleChange });
	}
	private OnDiscordMessage(message: Discord.Message): void {
		this.Logic.RunEvents("discord-message", message);
	}
	private OnDiscordReact(messageReaction: Discord.MessageReaction): void {
		this.Logic.RunEvents("discord-react", messageReaction);
	}
	private OnDiscordMemberRemove(
		member: Discord.GuildMember | Discord.PartialGuildMember
	): void {
		this.Logic.RunEvents("discord-leave", member);
	}
	private OnDiscordMemberJoin(
		member: Discord.GuildMember | Discord.PartialGuildMember
	): void {
		this.Logic.RunEvents("discord-join", member);
	}
	public Error(error: string | Error, context: unknown): unknown {
		if (this.Pm2 != null)
			return this.Pm2.notifyError(error, {
				custom: context as Record<string, unknown>,
			});
		return new Error(error.toString());
	}
	public AddLogicModule(mod: IModule): void {
		this.Logic.AddModule(this.Logic.CreateBoundLogicModule(mod));
	}

	public AddInteractionModule(mod: BitBotCommand | IBitBotCommand) {
		return this.Interactions.registerModule(
			mod instanceof BitBotCommand ? mod : new BitBotCommand(mod)
		);
	}

	public async LoadLogicFolder(folderPath: string): Promise<IModule[]> {
		return this.loadFolder<IModule>(folderPath, this.AddLogicModule);
	}

	public async LoadInteractionFolder(folderPath: string): Promise<IBitBotCommand[]> {
		return this.loadFolder<IBitBotCommand>(folderPath, this.AddInteractionModule);
	}

	/**
	 * Recursively load the files of a folder.
	 */
	public async loadFolder<T>(folderPath: string, cb?: (module: T) => any, modules: Promise<T>[] = []) {
		let absolute: string;
		if (path.isAbsolute(folderPath)) {
			absolute = folderPath;
		} else {
			absolute = path.join(__dirname, folderPath);
		}
		for (const file of fs.readdirSync(absolute)) {
			if (!file.startsWith(".")) {
				let filePath = path.join(folderPath, file);
				try {
					let stat = fs.lstatSync(filePath);
					if (stat.isDirectory()) {
						this.loadFolder<T>(filePath, cb, modules);
					} else if (stat.isFile()) {
						if (!(file.endsWith(".js") || file.endsWith(".mjs") || file.endsWith(".ts") || file.endsWith(".tjs"))) continue;
						const tempMod: any = import(path.join(folderPath, file));
						modules.push(tempMod?.default ?? tempMod?.Module ?? tempMod); //? Handle CJS, ESM, and CJS
					}
				} catch (error) {
					throw new BBError.Error("MODULE_LOAD", filePath);
				}
			}
		}
		const asyncModules = await Promise.all(modules);
		if (cb != null) {
			for (let mod of asyncModules)
				cb?.call?.(this, mod);
		}
		return asyncModules
	}

	public async RunEvents(
		event: string,
		data: unknown,
		module: string | string[] | false = false
	): Promise<Dictionary<string, unknown>> {
		return this.Logic.RunEvents(event, data, module);
	}
}
