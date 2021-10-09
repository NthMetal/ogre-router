import { v4 as uuid } from 'uuid';

export class User {

    id = '';
    alias = '';
    aliasNumber = '0000';
    signature = '';

    constructor(
        id?: string,
        alias?: string,
        aliasNumber?: string,
        signature?: string
    ) {
        this.id = id || uuid();
        this.aliasNumber = aliasNumber || alias?.split('#')[1] || this.getPaddedNumber();
        this.alias = alias || `Anon#${this.aliasNumber}`;
        this.signature = signature || '';
    }

    private getPaddedNumber(): string {
        return ('' + Math.floor(Math.random() * 10000)).padStart(4, '0');
    }

    setAlias(newAlias: string) {
        this.alias = `${newAlias}#${this.aliasNumber}`;
    }

    setSignature(newSignature: string) {
        this.signature = newSignature;
    }
}