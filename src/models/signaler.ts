import { BehaviorSubject, Subject } from "rxjs";
import { User } from "./user";

export class Signaler {

    socket;
    user;
    peerlist = new BehaviorSubject<string[]>([]);

    getOfferSubject = new Subject<{ source: string, offer: any}>();
    getAnswerSubject = new Subject<{ source: string, answer: any}>();

    constructor(user: User) {
        this.socket = new WebSocket('ws://localhost:8080');
        this.user = user;
        this.socket.addEventListener('open', this.socketOpened.bind(this));
        this.socket.addEventListener('message', this.socketMessage.bind(this));
    }

    socketOpened() {
        /** Look for existing identification */
        /** If identification doesn't exist, ask for it */
        /** Otherwise send the identification */
        const payload = JSON.stringify({
            event: 'userConnection',
            data: {
                id: this.user.id,
            }
        });
        this.socket.send(payload);
    }

    socketMessage(message: { data: string; }) {
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message.data);
        } catch (error) {}
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

    socket_peerlist(data: string[]) {
        this.peerlist.next(data.filter(userId => this.user.id !== userId));
    }
}