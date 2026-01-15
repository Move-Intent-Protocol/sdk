import { sha3_256 } from '@noble/hashes/sha3';
import { Intent } from './types';

export const DOMAIN_SEPARATOR = 'MOVE_INTENT_SWAP_V1';

export function computeIntentHash(intent: Intent): Uint8Array {
    const encoder = new TextEncoder();
    const data = new Uint8Array([
        ...encoder.encode(DOMAIN_SEPARATOR),
        ...hexToBytes(intent.maker),
        ...bigintToBytes(BigInt(intent.nonce)),
        ...hexToBytes(intent.sellToken),
        ...hexToBytes(intent.buyToken),
        ...bigintToBytes(BigInt(intent.sellAmount)),
        ...bigintToBytes(BigInt(intent.startBuyAmount)),
        ...bigintToBytes(BigInt(intent.endBuyAmount)),
        ...bigintToBytes(BigInt(intent.startTime)),
        ...bigintToBytes(BigInt(intent.endTime)),
    ]);

    return sha3_256(data);
}

export function hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (cleanHex.length % 2 !== 0) {
        throw new Error('Invalid hex string');
    }
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    return bytes;
}

export function bigintToBytes(value: bigint): Uint8Array {
    // Little-endian 64-bit integer
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setBigUint64(0, value, true); // true for little-endian
    return new Uint8Array(buffer);
}

export function bytesToHex(bytes: Uint8Array): string {
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
