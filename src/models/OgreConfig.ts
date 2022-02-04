import { StorageService } from "../storage/storage.service";

export interface OgreConfig {
    /**
     * The address of the ogre-router-server
     * This acts as the signaling server for the p2p connections through webrtc
     * And as the directory authority for the ogre network.
     */
    signalingAddress?: string;
    /**
     * A storage service that should be able to store data and retrieve it.
     * Currently stores user information.
     * Will default to using localStorage by default.
     */
    storageService?: StorageService;
}
