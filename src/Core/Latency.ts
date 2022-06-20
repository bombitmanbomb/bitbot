export class Latency {
	public limit: number;
	public list: number[];
	constructor(limit = 50) {
		this.limit = limit;
		this.list = [];
	}
	valueOf(): number {
		return this.average;
	}
	add(value: number): void {
		this.list.push(value);
		while (this.list.length > this.limit) this.list.pop();
	}
	get average(): number {
		return this.list.reduce((a, b) => a + b) / this.list.length;
	}
}
