import { Observable, Subject } from 'rxjs';
import * as SimplePeer from 'simple-peer';

export class Router {

    private peer: SimplePeer.Instance;

    private answer = new Subject<SimplePeer.SignalData>();
    private offer = new Subject<SimplePeer.SignalData>();
    private connection = new Subject<undefined>();
    private data = new Subject<string>();

    constructor(initiator: boolean) {
        this.peer = new SimplePeer.default({
            initiator: initiator,
            trickle: false
        });

        /**
         * Push method on Duplex object provided by simple-peer is overwritten
         * For some reason adding an event listener to on 'message' doesn't
         * actually give you messages when running it on a platform like angular
         */
        const push = this.peer.push;
        this.peer.push = (chunk: any, encoding?: BufferEncoding | undefined): boolean => {
            const result = push.call(this.peer, chunk, encoding);
            this.data.next(chunk);
            return result;
        }

        this.peer.on('error', err => console.log('error', err));
    
        this.peer.on('signal', data => {
            if (data.type === 'answer') {
                this.answer.next(data);
            } else {
                this.offer.next(data);
            }
        });
        
        this.peer.on('connect', () => {
            this.connection.next(undefined);
        });
    }

    public getOffer(): Promise<SimplePeer.SignalData> {
        return new Promise<SimplePeer.SignalData>(resolve => {
            this.offer.subscribe(offer => {
                resolve(offer);
            });
        })
    }

    public getAnswer(): Promise<SimplePeer.SignalData> {
        return new Promise<SimplePeer.SignalData>(resolve => {
            this.answer.subscribe(offer => {
                resolve(offer);
            });
        })
    }

    public onConnection(): Promise<void> {
        return new Promise<void>(resolve => {
            this.connection.subscribe(() => {
                resolve();
            })
        });
    }

    public onData(): Observable<string> {
        return this.data.asObservable();
    }

    public destroy(): void {
        this.answer.complete();
        this.offer.complete();
        this.connection.complete();
        this.data.complete();
        this.peer.destroy();
    }

    public signal(data: string | SimplePeer.SignalData): void {
        this.peer.signal(data)
    }

    public sendMessage(data: SimplePeer.SimplePeerData) {
        this.peer.send(data);
    }
}
