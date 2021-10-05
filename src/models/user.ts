import { v4 as uuid } from 'uuid';

export class User {

    id = '';
    alias = '';
    signature = '';

    constructor() {
        this.id = uuid();
        this.alias = `Anon#${this.getPaddedNumber()}`;
    }

    private getPaddedNumber(): string {
        return ('' + Math.floor(Math.random() * 10000)).padStart(4, '0');
    }

    setAlias(newAlias: string) {
        this.alias = `${newAlias}#${this.getPaddedNumber()}`;
    }

    setSignature(newSignature: string) {
        this.signature = newSignature;
    }
}