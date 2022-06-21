import { LogicManager } from "../Managers/LogicManager";
/** Runs on Module Load */
export interface IModuleLoadScript {
	(Manager: LogicManager): unknown;
}
