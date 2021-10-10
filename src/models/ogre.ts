import { BehaviorSubject, Observable, Subject } from "rxjs";
import { LocalstorageService } from "../storage/localStorage.storage";
import { StorageService } from "../storage/storage.service";
import { Signaler } from "./signaler";
import { Router } from "./router";
import { User } from "./user";

export interface IBaseMessage {
    bare: true;
    message: string;
    source: string;
    sourceAlias: string;
    target: string;
    date: Date;
}

export interface IOgreConfig {
    signalingAddress?: string;
    storageService?: StorageService;
}

export interface IUserRef {
    id: string;
    alias: string;
}

export class Ogre {

    private signaler!: Signaler;
    private user!: User;

    private targetUser: IUserRef | undefined = undefined;

    private messages = new Subject<IBaseMessage>();
    private storageService: StorageService;

    private gotUserSubject = new BehaviorSubject<User | undefined>(undefined);

    constructor(ogreConfig?: IOgreConfig) {
        this.storageService = ogreConfig && ogreConfig.storageService ?
            ogreConfig.storageService :
            new LocalstorageService();
        this.storageService.getUser().then(async user => {
            this.signaler = new Signaler(ogreConfig?.signalingAddress);
            await this.signaler.onSocketConnected();
            if (user) {
                this.user = user;
            } else {
                this.user = new User();
                const signature = await this.signaler.getSignature(this.user);
                this.user.setSignature(signature);
                this.storageService.setUser(this.user);
            }
            this.signaler.connectUser(this.user);
            this.gotUserSubject.next(this.user);
            this.signaler.observeOffers().subscribe(async data => {
                console.log('DEBUG', 'got offer', data);
                const predecessor = new Router(false);
                predecessor.signal(data.offer);
                const answer = await predecessor.getAnswer();
                this.signaler.sendAnswer(data.source, answer);
                predecessor.onData().subscribe(message => {
                    console.log('DEBUG', 'transfering message', message);
                    this.transferMessage(message);
                    // setTimeout(() => {predecessor.destroy();});
                });
                await predecessor.onConnection();
            });
        });
    }

    public onUserLoaded(): Observable<User | undefined> {
        return this.gotUserSubject.asObservable();
    }

    public observePeerList(): Observable<IUserRef[]> {
        return this.signaler.observePeerList();
    }

    public observeMessages(): Observable<IBaseMessage> {
        return this.messages.asObservable();
    }

    public async updateAlias(updatedName: string): Promise<User> {
        const updatedAlias = `${updatedName}#${this.user.aliasNumber}`;
        const signature = await this.signaler.getSignature(this.user, { alias: updatedAlias });
        this.user.setAlias(updatedName);
        this.user.setSignature(signature);
        this.storageService.setUser(this.user);
        return this.user;
    }
    
    public selectTargetPeer(user: IUserRef): void {
        this.targetUser = user;
    }

    public async sendMessage(message: string): Promise<void> {
        const circuit = this.createCircuit(this.targetUser, 2);
        const baseMessage: IBaseMessage = {
            bare: true,
            message,
            source: this.user.id,
            sourceAlias: this.user.alias,
            target: this.targetUser?.id || '',
            date: new Date()
        };
        const layeredMessage = this.layerMessage(circuit, JSON.stringify(baseMessage));
        await this.transferMessage(layeredMessage);
    }

    private createCircuit(targetUser: IUserRef | undefined, maxORs = 1): string[] {
        const peerlist = this.signaler.getPeerList();
        const circuit: string[] = [];
        if (!targetUser) return circuit;

        peerlist.forEach(peer => {
            if (
                peer.id !== this.user.id &&
                peer.id !== targetUser.id &&
                circuit.length < maxORs
            ) {
                circuit.unshift(peer.id);
            }
        });
        circuit.push(targetUser.id);
        return circuit;
    }

    private layerMessage(circuit: string[], message: string): string {
        // circuit
        let ogreMessage = message;
        circuit.reverse().forEach(userId => {
            ogreMessage = JSON.stringify({
                next: userId,
                message: ogreMessage
            });
        });
        return ogreMessage;
    }

    private peelMessage(layeredMessage: string): { next: string, message: string } | undefined {
        let parsedLayeredMessage;
        try {
            parsedLayeredMessage = JSON.parse(layeredMessage);
        } catch (error) {
            console.log('DEBUG', 'error parsing assuming this is final message: ', layeredMessage);
            return undefined;
        }
        if (parsedLayeredMessage && parsedLayeredMessage.bare) {
            console.log('DEBUG', 'peel, reached end of message', parsedLayeredMessage);
            this.messages.next(parsedLayeredMessage);
            return undefined;
        }
        console.log('DEBUG', 'peel successful', parsedLayeredMessage);
        return parsedLayeredMessage;
    }

    private async transferMessage(layeredMessage: string): Promise<void> {
        console.log('DEBUG', 'transfering message', layeredMessage);
        const peeledMessage = this.peelMessage(layeredMessage);
        if (!peeledMessage) return;

        const successor = new Router(true);
        const offer = await successor.getOffer();
        this.signaler.sendOffer(peeledMessage.next, offer);
        const answerData = await this.signaler.getAnswer();
        successor.signal(answerData.answer)
        await successor.onConnection();
        console.log('DEBUG', 'connected to next peer, sending message', peeledMessage.message);
        successor.sendMessage(peeledMessage.message);
        // TODO NTH: fix destroying only after message is successfully sent
        setTimeout(() => { successor.destroy(); }, 100);
    }

}