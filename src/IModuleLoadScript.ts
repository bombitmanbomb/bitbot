import { LogicManager } from "./LogicManager";
/** Runs on Module Load */
export interface IModuleLoadScript {
	(Manager: LogicManager): unknown;
}
