
export class User {

    id = '';
    alias = '';
    aliasNumber = '0000';

    constructor(
        id?: string,
        alias?: string,
        aliasNumber?: string
    ) {
        this.id = id ? id : '';
        this.aliasNumber = aliasNumber || alias?.split('#')[1] || this.getPaddedNumber();
        this.alias = alias || `Anon#${this.aliasNumber}`;
    }

    private getPaddedNumber(): string {
        return ('' + Math.floor(Math.random() * 10000)).padStart(4, '0');
    }

    setAlias(newAlias: string) {
        this.alias = `${newAlias}#${this.aliasNumber}`;
    }

    setId(id: string) {
        this.id = id;
    }

}