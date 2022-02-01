# Ogre Router

**CURRENTLY IN DEVELOPMENT**

**CURRENTLY REQUIRES THE USE OF [Ogre-Router-Server](https://github.com/NthMetal/ogre-router-server)**

[![Lint and test](https://github.com/NthMetal/ogre-router/actions/workflows/lint-and-test.yml/badge.svg)](https://github.com/NthMetal/ogre-router/actions/workflows/lint-and-test.yml)

[![Deploy to Github pages](https://github.com/NthMetal/ogre-router/actions/workflows/deploy-gh-pages.yml/badge.svg)](https://github.com/NthMetal/ogre-router/actions/workflows/deploy-gh-pages.yml)

This project hopes to create anonymous routing of data through the standard (chromium) browser.

It was inspired by Discord, Tor, [node-Tor](https://github.com/Ayms/node-Tor) among others. The routing mechanism is inspired by Tor's onion routing, but is not exactly the same (which is why the name was changed to ogre, though they both have layers).

## Goal

The goal of this project is to enable anonymous data transfer through the web.

When an ogre router is created it will automatically join the network. It can join different networks depending on where [ogre-router-server] is hosted. Once it joins the network it will be able to send anonymous messages to other ogre routers on the network.

The way it achieves this is similar to how the onion router works. It will create a circuit of ogre routers in the network and pass the message through them until it reaches the destination. Messages will be encrypted in layers and each layer will be peeled off as it goes through each router.

Each node in the network only knows it got a message and where to pass the message to. It won't know the target/source of the message unless it itself is the target/source. Message data will only be transfered between ogre-routers using a WebRTC data channel. The signaling server/da server will not touch any actual message contents and only exists to facilitate connections between ogre-routers.

## Onion Routing

The onion router or TOR provides anonymous browsing to the web or onion sites.

Put simply it works by routing your traffic through different onion routers. Your traffic is encrypted in several layers and as it goes through each onion router they remove a layer of encryption.

You can read more about technical specifications on TOR online.

![img](https://miro.medium.com/max/624/0*sDsZtvU8BDbeJ06J)

## Ogre Routing

This project currently aims to anonymously transfer data through the web in a similar way.

Below is an example flow diagram of a message being sent from Alice to Bob with Jill and John also connected to the network.

![img](assets/ogre-flowchart.png)

1. Alice connects to the directory authority/signaling server.
   - This connection is established through websockets.
   - Connecting to the directory authority is neccessary as it lets you know who is currently connected to the network. This lets you know which nodes can be included in the circuit.
2. Alice creates a circuit of routes the message will travel between. Each route is a user on the network. Yes. This does mean someone connected to the network will be routing random user's messages.
   1. After creating a circuit Alice will create the layers of encryption around her message.
   2. After encrypting her message she will send it to the first user on her circuit.
3. When Jill gets a message she will decrypt a layer of the message. Then she will send it to the next user in the circuit, John.
4. When John gets the message he will do the same thing as Jill and send it to Bob
5. When Bob finally gets the message from John, he can decrypt it and find out the message Alice sent and that it came from alice.

This is the basic idea behind this project.

## Usage

Most communication methods involve a server that handles incoming and outgoing messages. 

Typically the people who run the server promise not to read your messages. But they always can, and sometimes allow other users to flag you so they can read your messages.

This can be avoided by connecting directly from peer to peer, however this means exposing yourself to the person you're communicating with.

In order to avoid both of these the communication is routed similarly to the onion network.

## Caveats

By joining the network, you become a relay node. This means messages from other people will go through your browser, though you cannot read them.

## TODO

### Featrues
- [ ] Generate public and private key as part of user identity and send public key to server.
  - [ ] Use a web worker & web crypto api to create & store the private key (should be compatible with angular)
- [ ] Send public keys with peerlist.
- [ ] Add configurable fields to user object. (ex. Image)
- [ ] Wrap messages with the public key encryption.
- [ ] Unwrap a message using private key
- [ ] Send message recieved confirmation
- [ ] Add support for groups

### Known Issues
- [ ] WebRTC sending double messages sometimes.

## Security

Not Implemented Yet.

- Currently each user has no cryptographic material. 
- The ogre-router-server does not currently store any public keys.
- WebRTC Offers/Ansers are sent to the signaling server unencrypted
- Ogre Layering is only simple JSON.stringify & JSON.parse.

## Frequently Asked Questions

Coming Soon