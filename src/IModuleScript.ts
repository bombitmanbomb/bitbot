import { LogicManager } from "./LogicManager";
/** Runs on Event fire */
export interface IModuleScript {
	(Manager?: LogicManager, Event?: string, Data?: any): any;
}
