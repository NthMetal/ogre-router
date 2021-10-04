import { Subject } from "rxjs";
import { Predecessor } from "./predecessor";
import { Signaler } from "./signaler";
import { Successor } from "./successor";
import { User } from "./user";

export class Ogre {

    signaler: Signaler;
    successor: Successor | undefined;
    predecessor: Predecessor | undefined;
    user;

    targetUserId = '';

    messages = new Subject();

    constructor() {
        this.user = new User();
        this.signaler = new Signaler(this.user);
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
        console.log(circuit);
        const layeredMessage = this.layerMessage(circuit, message);
        await this.transferMessage(layeredMessage);
    }

    async transferMessage(layeredMessage: string) {
        let parsedLayeredMessage;
        try {
            parsedLayeredMessage = JSON.parse(layeredMessage);
        } catch(error) {
            console.log('error parsing assuming this is final message: ', layeredMessage);
            this.messages.next(layeredMessage.toString());
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
        // setTimeout(() => {successor.destroy();}, 100);
    }

}