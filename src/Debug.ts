export class Debug {
	public state: boolean;
	constructor() {
		this.state = false;
	}
	toggleDebug(): void {
		this.state = !this.state;
	}
	setDebug(f: boolean): void {
		this.state = f;
	}
	valueOf(): boolean {
		return this.state;
	}
}
