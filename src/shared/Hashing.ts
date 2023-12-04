import * as crypto from "crypto";

export function createHash(text: string, salt: string, pepper: string): string {
    const combinedText = `${text}${salt}`;
    const hmac = crypto.createHmac("sha256", pepper);
    const hashedText = hmac.update(combinedText).digest("hex");

    return hashedText;
}

export function verifyHash(originalText: string, salt: string, pepper: string, storedHash: string): boolean {
    // Recreate the hash using the provided parameters
    const computedHash = createHash(originalText, salt, pepper);

    // Use timing-safe comparison
    return crypto.timingSafeEqual(Buffer.from(computedHash, "hex"), Buffer.from(storedHash, "hex"));
}

export function generateSalt(length: number = 16): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
}
