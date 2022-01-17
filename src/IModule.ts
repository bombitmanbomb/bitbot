import { IModuleAction } from "./IModuleAction";
import { IModuleScript } from "./IModuleScript";
import { IModuleLoadScript } from "./IModuleLoadScript";
import { List } from "@bombitmanbomb/utils";
/**
 * BitBot Module
 */
export interface IModule {
	/** Module ID */
	id: string;
	/** Event List of events to watch */
	events?: string[] | List<string>;
	/** PM2 Actions */
	actions?: IModuleAction[] | List<IModuleAction>;
	/** Runs on module Load */
	load?: IModuleLoadScript;
	/** Runs on Event fire */
	script?: IModuleScript;
}
