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

export interface IUserRef {
    id: string;
    alias: string;
}

export interface IOgreConfig {
    /**
     * The address of the ogre-router-server
     * This acts as the signaling server for the p2p connections through webrtc
     * And as the directory authority for the ogre network.
     */
    signalingAddress?: string;
    /**
     * A storage service that should be able to store data and retrieve it.
     * Currently stores user information.
     * Will default to using localStorage by default.
     */
    storageService?: StorageService;
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

    /**
     * An observable that can be used to determine when user data has finished loading.
     * Attempting to access some functionality before user data has been loaded
     * will result in some errors.
     * @returns An observable that emits when the user data is loaded from storage.
     */
    public onUserLoaded(): Observable<User | undefined> {
        return this.gotUserSubject.asObservable();
    }

    /**
     * An observable used to listen to changes in the peer list.
     * This will emit when someone joins the network, leaves the network
     * or changes their name on the network
     * @returns An observable that emits the list of peers when it changes.
     */
    public observePeerList(): Observable<IUserRef[]> {
        return this.signaler.observePeerList();
    }

    /**
     * This observable is used to listen to messages sent to the current user.
     * @returns An observable that emits messages
     */
    public observeMessages(): Observable<IBaseMessage> {
        return this.messages.asObservable();
    }

    /**
     * Updates the user's alias. This will:
     * 1. Send a message to the signaling server indicating an update to the signature is needed.
     * 2. Wait till the signaling server responds with the signature.
     * 3. Update the user's info in memory.
     * 4. Update the user's info in the storage.
     * @param updatedName The new name. The number will stay the same.
     * @returns A promise with the updated user.
     */
    public async updateAlias(updatedName: string): Promise<User> {
        const updatedAlias = `${updatedName}#${this.user.aliasNumber}`;
        const signature = await this.signaler.getSignature(this.user, { alias: updatedAlias });
        this.user.setAlias(updatedName);
        this.user.setSignature(signature);
        this.storageService.setUser(this.user);
        return this.user;
    }
    
    /**
     * Updates the current target user.
     * The currently target user is the user messages will be sent to.
     * @param user The user reference.
     */
    public selectTargetPeer(user: IUserRef): void {
        this.targetUser = user;
    }

    /**
     * Sends a message to the currently targeted user via the ogre network.
     * The message will be wrapped in layers and routed through different users.
     * Each user will peel a layer and send it to the next user
     * until it reaches the target.
     * @param message message to send
     */
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

    /**
     * Creates the circuit that will determine what users the message will go through.
     * Currently only uses users from the peer list.
     * @param targetUser target user at the end of the circuit
     * @param maxORs max number of users in the circuit
     * @returns a string of user ids the message will route through
     */
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

    /**
     * Wraps the message in layers. Each layer will be peeled back by a user in the route.
     * Currently does not encrypt anything.
     * @param circuit generated circuit of user ids
     * @param message message to wrap in layers
     * @returns A string representing a message wrapped in layers and ready to be sent
     */
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

    /**
     * Peels a single layer from the message and returns the contents.
     * If the message is the last one and the current user is the target,
     * then this function will return undefined and emit a new value to the messages subject.
     * @param layeredMessage the layered message string to peel a layer from.
     * @returns the peeled message or undefined if there was an error or it's the last message.
     */
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

    /**
     * Transfers a message from the current user to the target in the message.
     * @param layeredMessage the layered message to transfer
     * @returns a promise indicating completion
     */
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