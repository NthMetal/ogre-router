import { User } from "../models/user";

export abstract class StorageService {
    
    abstract setUser(updatedUser: User): void;
    abstract getUser(): Promise<User | undefined>;
}