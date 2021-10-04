import { Subject } from "rxjs";
import * as SimplePeer from "simple-peer";

export class Successor {

    peer;

    answer = new Subject();
    offer = new Subject();
    connection = new Subject();
    data = new Subject();

    constructor() {
        this.peer = new SimplePeer.default({
            initiator: true,
            trickle: false
        });
        const push = this.peer.push;
        this.peer.push = (chunk: any, encoding?: BufferEncoding | undefined): boolean => {
            const result = push.call(this.peer, chunk, encoding);
            console.log('data3', chunk);
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
            this.connection.next(true);
        });
        
        // this.peer.on('data', data => {
        //     console.log('successor message: ', data);
        // });
    }

    getOffer() {
        return new Promise(resolve => {
            this.offer.subscribe(offer => {
                resolve(offer);
            });
        })
    }

    getAnswer() {
        return new Promise(resolve => {
            this.answer.subscribe(offer => {
                resolve(offer);
            });
        })
    }

    onConnection() {
        return new Promise<void>(resolve => {
            this.connection.subscribe(() => {
                resolve();
            })
        });
    }

    destroy() {
        this.answer.complete();
        this.offer.complete();
        this.connection.complete();
        this.data.complete();
        this.peer.destroy();
    }
}