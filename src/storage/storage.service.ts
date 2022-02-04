import { User } from "../models/User";

export abstract class StorageService {
    
    abstract setUser(updatedUser: User): void;
    abstract getUser(): Promise<User | undefined>;
}
