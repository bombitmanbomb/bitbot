import { LogicManager } from "../Managers/LogicManager";
/** Runs on Event fire */
export interface IModuleScript {
	(Manager?: LogicManager, Event?: string, Data?: any): any;
}
