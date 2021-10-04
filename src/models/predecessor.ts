import { Subject } from 'rxjs';
import * as SimplePeer from 'simple-peer';

export class Predecessor {

    peer;

    answer = new Subject();
    offer = new Subject();
    connection = new Subject<any>();
    data = new Subject<string>();

    constructor() {
        this.peer = new SimplePeer.default({
            initiator: false,
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
        //     console.log('predecessor message: ', data);
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

}

// successorPeer.on('error', err => console.log('error', err));

// successorPeer.on('signal', data => {
//     documentActions.updateWebRTCStatusInfo(`Got Signal: ${data.type}`);
//     documentActions.updateOutgoingInfo(JSON.stringify(data));
// });

// successorPeer.on('connect', () => {
//     documentActions.updateWebRTCStatusInfo('Connected!');
// });

// successorPeer.on('data', data => {
//     documentActions.addNewMessage(data);
// });