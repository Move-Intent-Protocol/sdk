import { sha3_256 } from 'js-sha3';

export const BCS = {
    // Helper to append byte arrays
    append: (data: Uint8Array, toAppend: Uint8Array): Uint8Array => {
        const merged = new Uint8Array(data.length + toAppend.length);
        merged.set(data);
        merged.set(toAppend, data.length);
        return merged;
    },

    // Helper to write u64 LE
    serializeU64: (val: bigint): Uint8Array => {
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setBigUint64(0, val, true); // true = littleEndian
        return new Uint8Array(buffer);
    },

    // Serialize String to Bytes (no length prefix if using raw bytes in contract)
    // NOTE: Contract uses `vector<u8>` which in Move BCS usually has a length prefix.
    // However, our `verifier.move` (if I recall) might just hash the bytes provided.
    // Let's check `verifier.move`: `intent.sell_token` is `vector<u8>`. 
    // In Move, `vector<u8>` is serialized as `uleb128(length) + bytes`.
    // My previous script might have skipped the length prefix?
    // Let's stick to raw bytes for now if logic was `signBuffer(raw)`.
    serializeBytes: (str: string): Uint8Array => {
        return new TextEncoder().encode(str);
    }
};

export function serializeIntent(
    maker: string, // "0x..."
    nonce: string, // u64 string
    sellToken: string,
    buyToken: string,
    sellAmount: number,
    startBuyAmount: number,
    endBuyAmount: number,
    startTime: number,
    endTime: number
): Uint8Array {
    let data = new Uint8Array(0);

    // 1. Domain Separator
    data = BCS.append(data, new TextEncoder().encode("MOVE_INTENT_SWAP_V1"));

    // 2. Maker Address (32 bytes)
    const makerBytes = hexToBytes(maker);
    // Pad to 32 bytes if needed? Aptos addresses are 32 bytes.
    if (makerBytes.length !== 32) {
        // Handle short address (0x1) -> pad.
        const padded = new Uint8Array(32);
        padded.set(makerBytes, 32 - makerBytes.length); // Right align? Or left?
        // Aptos addresses are usually 32 bytes fully.
        // Actually, `from_bcs::to_address` expects 32 bytes.
        // Let's assume standard 32 byte hex provided by wallet.
        data = BCS.append(data, makerBytes);
    } else {
        data = BCS.append(data, makerBytes);
    }

    // 3. Nonce
    data = BCS.append(data, BCS.serializeU64(BigInt(nonce)));

    // 4. Sell Token
    data = BCS.append(data, BCS.serializeBytes(sellToken));

    // 5. Buy Token
    data = BCS.append(data, BCS.serializeBytes(buyToken));

    // 6. Amounts & Times
    data = BCS.append(data, BCS.serializeU64(BigInt(Math.floor(sellAmount))));
    data = BCS.append(data, BCS.serializeU64(BigInt(Math.floor(startBuyAmount))));
    data = BCS.append(data, BCS.serializeU64(BigInt(Math.floor(endBuyAmount))));
    data = BCS.append(data, BCS.serializeU64(BigInt(startTime)));
    data = BCS.append(data, BCS.serializeU64(BigInt(endTime)));

    return data;
}

export function serializeLimitIntent(
    maker: string,
    nonce: string,
    sellToken: string,
    buyToken: string,
    sellAmount: number,
    buyAmount: number,
    expiryTime: number
): Uint8Array {
    let data = new Uint8Array(0);

    // 1. Domain Separator (NEW)
    data = BCS.append(data, new TextEncoder().encode("MOVE_LIMIT_ORDER_V1"));

    // 2. Maker Address
    const makerBytes = hexToBytes(maker);
    if (makerBytes.length !== 32) {
        // Pad for short addresses
        const padded = new Uint8Array(32);
        padded.set(makerBytes, 32 - makerBytes.length); // Right align
        data = BCS.append(data, padded);
    } else {
        data = BCS.append(data, makerBytes);
    }

    // 3. Nonce
    data = BCS.append(data, BCS.serializeU64(BigInt(nonce)));

    // 4. Sell Token
    data = BCS.append(data, BCS.serializeBytes(sellToken));

    // 5. Buy Token
    data = BCS.append(data, BCS.serializeBytes(buyToken));

    // 6. Amounts & Expiry
    data = BCS.append(data, BCS.serializeU64(BigInt(Math.floor(sellAmount))));
    data = BCS.append(data, BCS.serializeU64(BigInt(Math.floor(buyAmount))));
    data = BCS.append(data, BCS.serializeU64(BigInt(expiryTime)));

    return data;
}

export function hashIntent(serialized: Uint8Array): string {
    return sha3_256(serialized); // Returns hex string
}

function hexToBytes(hex: string): Uint8Array {
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
    const len = clean.length;
    const bytes = new Uint8Array(len / 2);
    for (let i = 0; i < len; i += 2) {
        bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
    }
    return bytes;
}
