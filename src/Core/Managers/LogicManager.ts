import type { BitBot } from "../BitBot";
import { uniqueId } from "lodash";
import { APIEmbed, WebhookClient } from "discord.js";
import { Dictionary, List, Out } from "@bombitmanbomb/utils";
import type Counter from "@pm2/io/build/main/utils/metrics/counter";
import type Gauge from "@pm2/io/build/main/utils/metrics/gauge";
import { LogicModule, IModuleAction, IModule } from "../Module";
import { Latency, Debug } from "../../Util";
import { BBError } from "../../Error";
let WHClient: WebhookClient;
const serializer = (key: string, value: any) => {
	switch (typeof value) {
		case "bigint": {
			return value.toString();
		}
		default:
			return value;
	}
};
export class LogicManager {
	public uniqueId: typeof uniqueId;
	public latency: Latency;
	public debug: Debug;
	public Bot: BitBot;
	public DebugWhitelist: string[];
	public DebugBlackList: string[];
	public Modules: Dictionary<string, LogicModule>;
	public Hooks: Dictionary<string, List<string>>;
	public Actions: Dictionary<string, IModuleAction>;
	protected EventsFired?: Counter;
	protected EventsHandled?: Counter;
	protected EventsActive?: Counter;
	protected ActionsRegistered?: Counter;
	protected ModuleCountMetric?: Gauge;
	protected HookCountMetric?: Gauge;
	constructor(Bot: BitBot) {
		this.uniqueId = uniqueId;
		this.latency = new Latency();
		this.debug = new Debug();
		this.Bot = Bot;
		if (this.Bot.Config?.Debug != null) {
			WHClient = new WebhookClient({
				id: this.Bot.Config.Debug.id,
				token: this.Bot.Config.Debug.token,
			});
		}
		this.DebugWhitelist = [];
		this.DebugBlackList = ["update-loop", "discord-message", "discord-react"];
		this.Modules = new Dictionary();
		this.Hooks = new Dictionary();
		this.Actions = new Dictionary();
		this.EventsFired = this.Bot.Pm2?.counter({
			name: "Events Fired",
			value: () => 0,
		});
		this.EventsHandled = this.Bot.Pm2?.counter({
			name: "Receivers Fired",
			value: () => 0,
		});
		this.EventsActive = this.Bot.Pm2?.counter({
			name: "Events Running",
			value: () => 0,
		});
		this.ActionsRegistered = this.Bot.Pm2?.counter({
			name: "Actions Registered",
			value: () => 0,
		});
		this.ModuleCountMetric = this.Bot.Pm2?.metric({
			name: "Registered Modules",
			value: () => {
				return this.Modules.Count;
			},
		});
		this.HookCountMetric = this.Bot.Pm2?.metric({
			name: "Registered Hooks",
			value: () => {
				return this.Hooks.Count;
			},
		});
	}
	public Error(error: string | Error, context: unknown): void {
		this.Bot.Error(error, context);
	}
	AddModule(Logic: LogicModule): boolean {
		if (!Logic?.isValid) return false;
		if (+this.debug) console.group("Define %s", Logic.id);
		this.Modules.AddOrUpdate(Logic.id, Logic, () => Logic);
		for (const event of Logic.events) {
			if (+this.debug) console.log("Adding Hook %s", event as string);
			if (this.Hooks.ContainsKey(event)) {
				const out: Out<List<string>> = new Out();
				this.Hooks.TryGetValue(event, out);
				out.Out?.Add(Logic.id);
			} else {
				this.Hooks.TryAdd(event, List.ToList([Logic.id]));
			}
		}
		for (const action of Logic.actions) {
			if (action.script != null) {
				this.ActionsRegistered?.inc();
				const id = Logic.id + "-action-" + (action.id ?? this.uniqueId());

				if (this.Hooks.ContainsKey(id)) {
					const out: Out<List<string>> = new Out();
					this.Hooks.TryGetValue(id, out);
					out.Out?.Add(Logic.id);
				} else {
					this.Hooks.TryAdd(id, List.ToList([Logic.id]));
				}
				this.Bot.Pm2?.action(
					action.name ?? id,
					async (cb: (scriptResponse: unknown) => unknown) => {
						if (+this.debug) console.log("Firing Action %s", id);
						cb(await action.script(this, Logic));
					},
				);
			} else {
				this.Bot.Error(new BBError.Error("MODULE_MISSING_SCRIPT", Logic.id), {
					action,
					Module: Logic.id,
				});
			}
		}
		Logic.Load?.(this);
		this.RunEvents("ModuleLoaded", Logic.id);
		if (+this.debug) {
			console.groupEnd();
			console.log("%s Defined", Logic.id);
		}
		return true;
	}
	public async RunEvents(
		event: string,
		data?: unknown,
		moduleList: string | string[] | false = false,
	): Promise<Dictionary<string, unknown>> {
		const runTime = new Date();
		const runId = this.uniqueId();
		const thisEventTimer = event + runId;
		this.EventsFired?.inc();
		if (+this.debug) {
			console.log(`Firing Event ${event}`);
			console.time(thisEventTimer);
		}
		const eventList: Out<List<string>> = new Out();
		if (this.Hooks.TryGetValue(event, eventList)) {
			const responses: Dictionary<string, unknown> = new Dictionary();
			for (const eventModule of eventList.Out as List<unknown>) {
				if (
					moduleList && typeof moduleList == "string"
						? !(eventModule == moduleList)
						: Array.isArray(moduleList)
							? !moduleList.includes(eventModule)
							: false
				)
					continue;

				const thisModuleTimer = this.uniqueId(eventModule);
				if (+this.debug) {
					console.groupCollapsed(eventModule);
					console.count(eventModule);
					console.time(thisModuleTimer);
				}
				const mod: Out<LogicModule> = new Out();
				this.Modules.TryGetValue(eventModule, mod);
				this.EventsHandled?.inc();
				this.EventsActive?.inc();
				const response = await mod.Out?.RunModule(this, event, data);
				this.EventsActive?.dec();
				responses.TryAdd(eventModule, response);
				if (+this.debug) {
					console.timeEnd(thisModuleTimer);
					console.log(`${event} handled by ${mod.Out?.id}`);
					//console.table(response);
					console.groupEnd();
				}
			}
			if (+this.debug) {
				if (
					this.DebugWhitelist.includes(event) ||
					(this.DebugWhitelist.length == 0 &&
						!this.DebugBlackList.includes(event))
				) {
					const EMBEDS: APIEmbed[] = [];
					const Embed = new this.Bot.Discord._discord.EmbedBuilder()
						.setTitle(event)
						.setDescription(
							`\`\`\`json\n${
								data != null
									? JSON.stringify(data, serializer).substring(0, 1000)
									: "No Content"
							}\`\`\``,
						);

					for (const a of responses.IteratorList()) {
						Embed.addFields({
							name: a.Key,
							value: `\`\`\`json\n${
								a.Value != null
									? JSON.stringify(a.Value, serializer).substring(0, 1000)
									: "No Content"
							}\`\`\``,
						});
						console.log("EVENTS", event, data, a);
					}
					const delay = Math.abs(runTime.getTime() - new Date().getTime());
					this.latency.add(delay);
					const percentage = 100 - Math.floor(Math.min(delay / 500, 1) * 100);
					let r,
						g = 0;
					const b = 0;
					if (percentage < 50) {
						r = 255;
						g = Math.round(5.1 * percentage);
					} else {
						g = 255;
						r = Math.round(510 - 5.1 * percentage);
					}
					const color: [number, number, number] = [r, g, b];
					Embed.setFooter({
						text: "Execution: " + new Date(delay).getTime() + "ms • " + runId,
					});
					Embed.setColor(color);
					EMBEDS.push(Embed.data);
					if (WHClient) WHClient.send({ embeds: EMBEDS });
				}

				console.timeEnd(thisEventTimer);
				console.table(responses);
			}
			return responses;
		}
		return new Dictionary();
	}
	sendDebug(
		message: string,
		name = "Debug",
		title = "Debug",
		override = false,
	): void {
		if (+this.debug || override) {
			if (WHClient)
				WHClient.send({
					embeds: [
						{
							title,
							fields: [
								{
									name,
									value: `\`\`\`json\n${JSON.stringify(message).substring(
										0,
										1000,
									)}\n\`\`\``,
								},
							],
						},
					],
				});
		}
	}
	get isValid(): true {
		return true;
	}
	public CreateBoundLogicModule(module: IModule): LogicModule {
		return new LogicModule(this, module);
	}
}
