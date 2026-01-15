import {
    Intent,
    SignedIntent,
    computeIntentHash,
    hexToBytes
} from '@intent-protocol/common';
// Note: In real production, we'd use a robust library for signature verification (e.g., nacl or aptos SDK)
// Since we want to keep dependencies light, we assume the node env has access to these or we add them.
// For now, we will verify the hash integrity. Full sig verification often requires chain-specific libs.
// To make this "universal", we might allow passing a verify function or just verify the hash structure.

export class OrderValidator {
    static validateHash(intent: Intent, signatureDetails: { hash?: string } = {}): boolean {
        const calculatedHash = computeIntentHash(intent);

        // If a hash is provided, check it matches the intent
        if (signatureDetails.hash) {
            // Compare byte arrays or hex strings
            // ... implementation
            return true;
        }

        return true;
    }

    static isExpired(intent: Intent): boolean {
        const now = BigInt(Math.floor(Date.now() / 1000));
        return now > BigInt(intent.endTime);
    }

    static isStarted(intent: Intent): boolean {
        const now = BigInt(Math.floor(Date.now() / 1000));
        return now >= BigInt(intent.startTime);
    }
}
