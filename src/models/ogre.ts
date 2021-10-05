import { Subject } from "rxjs";
import { LocalstorageService } from "../storage/localStorage.storage";
import { StorageService } from "../storage/storage.service";
import { Predecessor } from "./predecessor";
import { Signaler } from "./signaler";
import { Successor } from "./successor";
import { User } from "./user";

export interface IBaseMessage {
    bare: true;
    message: string;
    source: string;
    target: string;
    date: Date;
}

export interface IOgreConfig {
    signalingAddress: string;
    storageService: StorageService;
}

export class Ogre {

    signaler!: Signaler;
    successor: Successor | undefined;
    predecessor: Predecessor | undefined;
    user!: User;

    targetUserId = '';

    messages = new Subject<IBaseMessage>();
    storageService: StorageService;

    private gotUserSubject = new Subject<boolean>();

    constructor(ogreConfig?: IOgreConfig) {
        this.storageService = ogreConfig && ogreConfig.storageService ?
            ogreConfig.storageService :
            new LocalstorageService();
        this.storageService.getUser().then(user => {
            this.gotUserSubject.next(true);
            this.user = user;
            this.signaler = new Signaler(this.user, ogreConfig?.signalingAddress);
            this.signaler.getOfferSubject.subscribe(async data => {
                const predecessor = new Predecessor();
                console.log('socket get offer: ', data);
                predecessor.peer.signal(data.offer);
                const answer = await predecessor.getAnswer();
                this.signaler.sendAnswer(data.source, answer);
                predecessor.data.subscribe(message => {
                    console.log('got message: ', message);
                    this.transferMessage(message);
                    // setTimeout(() => {predecessor.destroy();});
                });
                await predecessor.onConnection();
                console.log('predecessor connected: ', data);
            });
        });
    }

    gotUser() {
        return new Promise<void>(resolve => {
            this.gotUserSubject.subscribe(() => {
                resolve();
            })
        });
    }

    getPeerList() {
        return this.signaler.peerlist.value;
    }

    observePeerList() {
        return this.signaler.peerlist;
    }

    createCircuit(targetUserId: string, maxORs = 1) {
        const peerlist = this.getPeerList();
        const circuit = [];

        peerlist.forEach(peer => {
            if (
                peer !== this.user.id &&
                peer !== targetUserId &&
                circuit.length < maxORs
            ) {
                circuit.unshift(peer);
            }
        });
        circuit.push(targetUserId);
        return circuit;
    }

    selectTargetPeer(id: string) {
        this.targetUserId = id;
    }

    layerMessage(circuit: string[], message: string) {
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

    async sendMessage(message: string) {
        console.log(`target ${this.targetUserId} sending ${message}`);
        const circuit = this.createCircuit(this.targetUserId, 2);
        const baseMessage: IBaseMessage = {
            bare: true,
            message,
            source: this.user.id,
            target: this.targetUserId,
            date: new Date()
        };
        const layeredMessage = this.layerMessage(circuit, JSON.stringify(baseMessage));
        await this.transferMessage(layeredMessage);
    }

    async transferMessage(layeredMessage: string) {
        let parsedLayeredMessage;
        try {
            parsedLayeredMessage = JSON.parse(layeredMessage);
        } catch (error) {
            console.log('error parsing assuming this is final message: ', layeredMessage);
            return;
        }
        if (parsedLayeredMessage && parsedLayeredMessage.bare) {
            this.messages.next(parsedLayeredMessage);
            return;
        }
        console.log(layeredMessage, parsedLayeredMessage);
        const nextMessage = parsedLayeredMessage.message;
        const targetUserId = parsedLayeredMessage.next;

        console.log('targeted user: ', targetUserId);

        const successor = new Successor();
        const offer = await successor.getOffer();
        this.signaler.sendOffer(targetUserId, offer);
        const answerData = await this.signaler.getAnswer();
        successor.peer.signal(answerData.answer)
        await successor.onConnection();
        successor.peer.send(nextMessage);
        // TODO NTH: fix destroying only after message is successfully sent
        setTimeout(() => { successor.destroy(); }, 100);
    }

}