import { BehaviorSubject, Subject } from "rxjs";
import { User } from "./user";

export class Signaler {

    socket;
    user;
    peerlist = new BehaviorSubject<{id: string, alias: string}[]>([]);

    getOfferSubject = new Subject<{ source: string, offer: any}>();
    getAnswerSubject = new Subject<{ source: string, answer: any}>();

    constructor(user: User, signalingAddress?: string) {
        this.socket = new WebSocket( signalingAddress || 'ws://localhost:8080');
        this.user = user;
        this.socket.addEventListener('open', this.socketOpened.bind(this));
        this.socket.addEventListener('message', this.socketMessage.bind(this));
    }

    socketOpened() {
        const payload = JSON.stringify({
            event: 'userConnection',
            data: {
                id: this.user.id,
                alias: this.user.alias,
                signature: this.user.signature
            }
        });
        this.socket.send(payload);
    }

    socket_userAcknowledged(data: { id: string, signature: string }) {
        if (data && data.signature) {
            this.user.setSignature(data.signature);
        }
    }

    socketMessage(message: { data: string; }) {
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message.data);
        } catch (error) {
            console.log('Error parsing socket message');
        }
        if (!parsedMessage || !parsedMessage.event) return;
        const handler = this['socket_' + parsedMessage.event as keyof this] as any;
        if (handler) {
            handler.call(this, parsedMessage.data);
        }
    }

    sendOffer(targetUserId: string, offer: any) {
        const payload = JSON.stringify({
            event: 'sendOffer',
            data: {
                target: targetUserId,
                offer: offer
            }
        });
        this.socket.send(payload);
    }

    getOffer() {
        return new Promise(resolve => {
            this.getOfferSubject.subscribe(nextValue => {
                resolve(nextValue);
            })
        })
    }
    async socket_getOffer(data: any) {
        this.getOfferSubject.next(data);
    }

    
    sendAnswer(targetUserId: string, answer: any) {
        const payload = JSON.stringify({
            event: 'sendAnswer',
            data: {
                target: targetUserId,
                answer: answer
            }
        });
        this.socket.send(payload);
    }

    getAnswer() {
        return new Promise<{
            source: string;
            answer: any;
        }>(resolve => {
            this.getAnswerSubject.subscribe(nextValue => {
                resolve(nextValue);
            })
        })
    }
    async socket_getAnswer(data: any) {
        this.getAnswerSubject.next(data);
    }

    socket_peerlist(data: {id: string, alias: string}[]) {
        this.peerlist.next(data.filter(user => this.user.id !== user.id));
    }
}