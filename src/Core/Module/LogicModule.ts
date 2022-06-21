import { List } from "@bombitmanbomb/utils";
import type { LogicManager } from "../Managers";
import { IModuleScript } from "./IModuleScript";
import { IModuleLoadScript } from "./IModuleLoadScript";
import { IModule } from "./IModule";
import { IModuleAction } from "./IModuleAction";
/**
 * Logic Module for receiving and running events
 */
export class LogicModule {
	public id!: string;
	public Manager: LogicManager;
	public events: List<string>;
	public actions: List<IModuleAction>;
	public Script?: IModuleScript;
	public Load?: IModuleLoadScript;
	constructor(Manager: LogicManager, ID: string | IModule, Module?: IModule) {
		this.Manager = Manager;
		this.events = new List();
		this.actions = new List();
		if (typeof ID === "string") this.id = ID;
		else if (typeof ID === "object") this.SetupModule(ID);
		else if (ID == null && Module == null)
			this.id = Manager.uniqueId("LogicModule-");
		if (Module != null) this.SetupModule(Module);
	}
	private SetupModule(Module: IModule): void {
		this.id = Module.id;
		if (Module.script) this.SetScript(Module.script);
		if (Module.load) this.SetLoadScript(Module.load);
		if (Module.actions) this.actions.AddRange(List.ToList(Module.actions));
		if (Module.events) this.events.AddRange(List.ToList(Module.events));
	}
	public SetScript(fn: IModuleScript): void {
		this.Script = fn;
	}
	public SetLoadScript(fn: IModuleLoadScript): void {
		this.Load = fn;
	}
	public async RunModule(
		Manager: LogicManager,
		hook: string,
		data: unknown
	): Promise<unknown> {
		try {
			if (this.Script) return this.Script(Manager, hook, data);
			return false;
		} catch (error) {
			this.Manager.Error(error as Error, { Module: this.id, hook, data });
		}
	}
	get isValid(): boolean {
		return (
			this.Manager != null &&
			this.id != null &&
			(this.events.length > 0 || this.Load != null) &&
			typeof this.Script === "function"
		);
	}
}
