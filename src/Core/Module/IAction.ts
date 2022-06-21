import { LogicManager } from "../Managers/LogicManager";
import { LogicModule } from "./LogicModule";
export interface IAction {
	script: (manager: LogicManager, module: LogicModule) => unknown;
	name?: string;
}
