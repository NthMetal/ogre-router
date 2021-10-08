import { BehaviorSubject, Observable, Subject } from "rxjs";
import { IUserRef } from "./ogre";
import { User } from "./user";

interface IOfferRef { 
    source: string;
    offer: any;
}

interface IAnswerRef {
    source: string;
    answer: any;
}

export class Signaler {

    private socket;
    private user;
    private peerlist = new BehaviorSubject<IUserRef[]>([]);

    private getOfferSubject = new Subject<IOfferRef>();
    private getAnswerSubject = new Subject<IAnswerRef>();

    constructor(user: User, signalingAddress?: string) {
        this.socket = new WebSocket( signalingAddress || 'ws://localhost:8080');
        this.user = user;
        this.socket.addEventListener('open', this.socketOpened.bind(this));
        this.socket.addEventListener('message', this.socketMessage.bind(this));
    }

    public getPeerList(): IUserRef[] {
        return this.peerlist.value;
    }
    public observePeerList(): Observable<IUserRef[]> {
        return this.peerlist.asObservable();
    }

    public getOffer() {
        return new Promise(resolve => {
            this.getOfferSubject.subscribe(nextValue => {
                resolve(nextValue);
            })
        })
    }
    public getAnswer() {
        return new Promise<{
            source: string;
            answer: any;
        }>(resolve => {
            this.getAnswerSubject.subscribe(nextValue => {
                resolve(nextValue);
            })
        })
    }
    public observeOffers(): Observable<IOfferRef> {
        return this.getOfferSubject.asObservable();
    }
    public sendOffer(targetUserId: string, offer: any) {
        const payload = JSON.stringify({
            event: 'sendOffer',
            data: {
                target: targetUserId,
                offer: offer
            }
        });
        this.socket.send(payload);
    }
    public sendAnswer(targetUserId: string, answer: any) {
        const payload = JSON.stringify({
            event: 'sendAnswer',
            data: {
                target: targetUserId,
                answer: answer
            }
        });
        this.socket.send(payload);
    }
    
    private socketOpened() {
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
    private socketMessage(message: { data: string; }) {
        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message.data);
        } catch (error) {
            console.log('Error parsing socket message');
        }
        if (!parsedMessage || !parsedMessage.event) return;
        const handlerMap = {
            'getOffer': this.socket_getOffer,
            'getAnswer': this.socket_getAnswer,
            'userAcknowledged': this.socket_userAcknowledged,
            'peerlist': this.socket_peerlist
        };
        const messageEvent: keyof typeof handlerMap = parsedMessage.event;
        const handler = handlerMap[messageEvent] as (data: any) => void;
        if (handler) {
            handler.call(this, parsedMessage.data);
        }
    }
    private socket_getOffer(data: any): void {
        this.getOfferSubject.next(data);
    }
    private socket_getAnswer(data: any): void {
        this.getAnswerSubject.next(data);
    }
    private socket_userAcknowledged(data: { id: string, signature: string }): void {
        if (data && data.signature) {
            this.user.setSignature(data.signature);
        }
    }
    private socket_peerlist(data: {id: string, alias: string}[]): void {
        this.peerlist.next(data.filter(user => this.user.id !== user.id));
    }
}