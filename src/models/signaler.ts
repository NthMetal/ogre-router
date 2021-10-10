import { BehaviorSubject, Observable, Subject } from "rxjs";
import { IUserRef } from "./ogre";
import { User } from "./user";

export interface IOfferRef { 
    source: string;
    offer: any;
}

export interface IAnswerRef {
    source: string;
    answer: any;
}

export class Signaler {

    private socket;
    private peerlist = new BehaviorSubject<IUserRef[]>([]);

    private getConnectedSubject = new Subject<boolean>();
    private getOfferSubject = new Subject<IOfferRef>();
    private getAnswerSubject = new Subject<IAnswerRef>();
    private getSignatureSubject = new Subject<string>();

    constructor(signalingAddress?: string) {
        this.socket = new WebSocket( signalingAddress || 'ws://localhost:3000');
        this.socket.addEventListener('open', () => {
            this.getConnectedSubject.next(true);
        });
        this.socket.addEventListener('message', this.socketMessage.bind(this));
    }

    public onSocketConnected(): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            this.getConnectedSubject.subscribe(connected => {
                resolve(connected);
            });
        });
    }

    public getPeerList(): IUserRef[] {
        return this.peerlist.value;
    }
    public observePeerList(): Observable<IUserRef[]> {
        return this.peerlist.asObservable();
    }

    public getOffer(): Promise<IOfferRef> {
        return new Promise<IOfferRef>(resolve => {
            this.getOfferSubject.subscribe(nextValue => {
                resolve(nextValue);
            })
        })
    }
    public getAnswer(): Promise<IAnswerRef> {
        return new Promise<IAnswerRef>(resolve => {
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

    public connectUser(user: User): void {
        const payload = JSON.stringify({
            event: 'userConnection',
            data: {
                id: user.id,
                alias: user.alias,
                signature: user.signature
            }
        });
        this.socket.send(payload);
    }
    public getSignature(user: User, updates?: { alias: string }): Promise<string> {
        return new Promise<string> (resolve => {
            const payload = JSON.stringify({
                event: 'userSignature',
                data: {
                    id: user.id,
                    alias: user.alias,
                    signature: user.signature,
                    updates
                }
            });
            this.socket.send(payload);
            this.getSignatureSubject.subscribe(signature => {
                resolve(signature);
            });
        });

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
            'userSignature': this.socket_userSignature,
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
    private socket_userSignature(data: { id: string, signature: string }): void {
        if (data && data.signature) {
            this.getSignatureSubject.next(data.signature);
        }
    }
    private socket_peerlist(data: {id: string, alias: string}[]): void {
        this.peerlist.next(data);
    }
}