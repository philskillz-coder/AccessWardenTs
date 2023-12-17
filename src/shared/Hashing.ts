import * as crypto from "crypto";

export default class Hashing {
    static createHash(text: string, salt: string, pepper: string): string {
        const combinedText = `${text}${salt}`;
        const hmac = crypto.createHmac("sha256", pepper);
        const hashedText = hmac.update(combinedText).digest("hex");

        return hashedText;
    }

    static verifyHash(originalText: string, salt: string, pepper: string, storedHash: string): boolean {
        const computedHash = Hashing.createHash(originalText, salt, pepper);

        return crypto.timingSafeEqual(Buffer.from(computedHash, "hex"), Buffer.from(storedHash, "hex"));
    }

    static generateSalt(length: number = 16): string {
        return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
    }
}
