import { OgreConfig } from "./models/OgreConfig";
import { User } from "./models/User";
import { ConnectionService } from "./services/connection.service";
import { MessageService } from "./services/message.service";
import { WebRTCService } from "./services/webRTC.service";
import { LocalstorageService } from "./storage/localStorage.storage";
import { StorageService } from "./storage/storage.service";

export class OgreRouter {

    private storageService: StorageService;
    private connectionService: ConnectionService;
    private messageService: MessageService;
    private webRTCService: WebRTCService;

    constructor(ogreConfig?: OgreConfig) {
        // Initialize services
        this.storageService = ogreConfig?.storageService || new LocalstorageService();
        this.connectionService = new ConnectionService();
        this.messageService = new MessageService();
        this.webRTCService = new WebRTCService();
    }

    public getMy(): User {
        return;
    }
    
    public getUsers():void {
        return;
    }

    public connect():void {
        return;
    }
    public disconnect():void {
        return;
    }
    public sendMessage():void {
        return;
    }
    public listenMessages():void {
        return;
    }

}
