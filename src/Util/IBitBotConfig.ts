export interface IBitBotConfig {
	Tokens: {
		Discord: string;
		[key: string]: string;
	};
	Debug?: {
		id: string;
		token: string;
	};
	Name?: string;
}
