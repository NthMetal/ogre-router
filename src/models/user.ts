export class User {

    id: string = '';

    constructor() {
        this.id = 'User_' + Math.floor(Math.random()*1000);
    }
}