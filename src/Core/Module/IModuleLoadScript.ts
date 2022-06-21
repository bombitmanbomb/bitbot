import { LogicManager } from "../Managers";
/** Runs on Module Load */
export interface IModuleLoadScript {
	(Manager: LogicManager): unknown;
}
