import * as crypto from 'crypto';

export class Crypto {
    /**
     * Uses a public key to encrypt some plaintext.
     * @param plaintext the plaintext to be encrypted.
     * @param publicKey the public key. Can be a Buffer, or a crypto.KeyObject
     * @returns encrypted buffer
     */
    public static encrypt(plaintext: string, publicKey: string | Buffer | crypto.KeyObject): Buffer {
        const buffer = Buffer.from(plaintext, 'utf8');
        const ciphertext = crypto.publicEncrypt(publicKey, buffer);
        return ciphertext;
    }

    /**
     * Uses a private key to decrypt some ciphertext.
     * @param ciphertext the ciphertext to be decrypted. Can be encoded string or Buffer.
     * @param privateKey the private key that should be used for encryption
     * @returns encrypted buffer
     */
    public static decrypt(ciphertext: Buffer, privateKey: string | Buffer | crypto.KeyObject): Buffer {
        const resolvedPrivateKey = !(privateKey instanceof crypto.KeyObject) ? {
            key: privateKey.toString(),
            passphrase: ''
        } : privateKey;
        const plaintext = crypto.privateDecrypt(resolvedPrivateKey, ciphertext);
        return plaintext;
    }

    /**
     * Generates a private and public EC key pair.
     * @returns Promise that resolves when keys are generated.
     *          Resolves into object with public and private keypair.
     * @todo Options cannot be changed. Currently only used for testing sign & unsign
     */
    public static generateRSAKeypair(): Promise<{ publicKey: string, privateKey: string }> {
        return new Promise((resolve, reject) => {
            crypto.generateKeyPair('ec', {
                namedCurve: 'secp521r1',
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem',
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem',
                    cipher: 'aes-256-cbc',
                    passphrase: ''
                }
            }, (err: Error | null, publicKey: string, privateKey: string) => {
                if (err) return reject(err);
                return resolve({ publicKey, privateKey });
            });
        });
    }

}