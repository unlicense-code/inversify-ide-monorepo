type RecentsOptions = {
    maxValues?: number;
}

export class Recents {
    protected maxValues: number;
    protected _values: string[] = [];
    get values(): string[] {
        return this._values;
    }

    constructor(initialValues?: string[], opts?: RecentsOptions) {
        this.maxValues = opts?.maxValues ?? 10;
        if (initialValues) {
            if (initialValues.length <= this.maxValues) {
                this._values = initialValues;
                return;
            }
            console.error('Initial values length is greater than allowed length, resetting to empty array');
        }
        this._values = [];
    }

    add(locationString: string): void {
        const indexOf = this.has(locationString);
        if (indexOf > -1) {
            this._values.splice(indexOf, 1);
        } else {
            if (this._values.length === this.maxValues) {
                this._values.shift();
            }
        }
        this._values.push(locationString);
    }

    has(locationString: string): number {
        return this._values.indexOf(locationString);
    }
}
