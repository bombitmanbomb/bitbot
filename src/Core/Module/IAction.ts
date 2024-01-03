import { LogicManager } from "../Managers";
import { LogicModule } from "./LogicModule";
export interface IAction {
	script: (manager: LogicManager, module: LogicModule) => unknown;
	name?: string;
}
