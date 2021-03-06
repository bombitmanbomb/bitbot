import { BBError } from "./BBError";

export const Messages = {
	MANAGER_DESTROYED: "Manager was destroyed.",

	TOKEN_INVALID: "An invalid token was provided.",
	TOKEN_MISSING:
		"Request to use token, but token was unavailable to the client.",

	CLIENT_INVALID_OPTION: (prop: string, must: string) =>
		`The ${prop} option must be ${must}`,
	CLIENT_NOT_READY: (action: string) =>
		`The client needs to be logged in to ${action}.`,

	INVALID_TYPE: (name: string, expected: string, an = false) =>
		`Supplied ${name} is not a${an ? "n" : ""} ${expected}.`,
	INVALID_ELEMENT: (type: string, name: string, elem: any) =>
		`Supplied ${type} ${name} includes an invalid element: ${elem}`,

	NOT_IMPLEMENTED: (what: string, name: string) =>
		`Method ${what} not implemented on ${name}.`,

	MODULE_MISSING_SCRIPT: (module_id: string) =>
		`Missing Script in Module: ${module_id}`,
	MODULE_LOAD: (module: string) => `Error Loading Module-File: ${module}`,
	MODULE_TYPE_INVALID: (module_type: string, module_id: string) =>
		`Failed to load module \`${module_id}\`. Unsupported Type: ${module_type}`,
	MODULE_SYNTAX_INVALID: (module_id: string) =>
		`Invalid Syntax in Module: ${module_id}`,

	FILE_NOT_FOUND: (file: string) => `File could not be found: ${file}`,
	DIRECTORY_NOT_FOUND: (directory: string) =>
		`Directory could not be found: ${directory}`,

	DEV_ERROR: (error: string) => error,
};

for (const [name, message] of Object.entries(Messages))
	BBError.register(name, message);
