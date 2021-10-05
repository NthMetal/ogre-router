import { User } from "../models/user";

export abstract class StorageService {
    
    abstract setUser(updatedUser: User): void;
    abstract getUser(): Promise<User>;

    protected getNewUser(): User {
        const newUser = new User();
        this.setUser(newUser);
        return new User();
    }
}