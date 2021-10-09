import { User } from "../main";
import { StorageService } from "./storage.service";

export class LocalstorageService extends StorageService {

    private userStorageKey = 'ogreRouterUser';
    private localStorage: Storage;

    constructor() {
        super();
        if (!window || !window.localStorage) {
            throw new Error('Error: this storage service can only be used in the browser');
        }
        this.localStorage = window.localStorage;
        // localStorage.clear
        // localStorage.getItem
        // localStorage.key
        // localStorage.length
        // localStorage.removeItem
        // localStorage.setItem
    }

    setUser(updatedUser: User): void {
        this.localStorage.setItem(this.userStorageKey, JSON.stringify(updatedUser));
    }
    async getUser(): Promise<User | undefined> {
        const userString = this.localStorage.getItem(this.userStorageKey);
        if (!userString) return undefined;
        let user: User;
        try {
            const baseUser = JSON.parse(userString);
            user = new User(
                baseUser.id,
                baseUser.alias,
                baseUser.aliasNumber,
                baseUser.signature
            );
        } catch (error) { return undefined }
        return user;
    }

}