export class User {

    id = '';

    constructor() {
        this.id = 'User_' + Math.floor(Math.random()*1000);
    }
}