import {
    Intent,
    SignedIntent,
    computeIntentHash,
    bytesToHex,
    hexToBytes
} from '@intent-protocol/common';

export type Signer = (message: Uint8Array) => Promise<string>;

export class IntentBuilder {
    private intent: Partial<Intent> = {};

    constructor(private signer: Signer) { }

    setMaker(maker: string): this {
        this.intent.maker = maker;
        return this;
    }

    setNonce(nonce: string | number): this {
        this.intent.nonce = nonce.toString();
        return this;
    }

    setSellToken(token: string): this {
        this.intent.sellToken = token;
        return this;
    }

    setBuyToken(token: string): this {
        this.intent.buyToken = token;
        return this;
    }

    setSellAmount(amount: string | number): this {
        this.intent.sellAmount = amount.toString();
        return this;
    }

    setStartBuyAmount(amount: string | number): this {
        this.intent.startBuyAmount = amount.toString();
        return this;
    }

    setEndBuyAmount(amount: string | number): this {
        this.intent.endBuyAmount = amount.toString();
        return this;
    }

    setStartTime(time: string | number): this {
        this.intent.startTime = time.toString();
        return this;
    }

    setEndTime(time: string | number): this {
        this.intent.endTime = time.toString();
        return this;
    }

    async build(): Promise<SignedIntent> {
        this.validate();

        // Create complete intent object
        const finalIntent = this.intent as Intent;

        // Hash
        const hash = computeIntentHash(finalIntent);

        // Sign
        const signature = await this.signer(hash);

        return {
            ...finalIntent,
            signature
        };
    }

    private validate(): void {
        const required = [
            'maker', 'nonce', 'sellToken', 'buyToken',
            'sellAmount', 'startBuyAmount', 'endBuyAmount',
            'startTime', 'endTime'
        ];

        for (const field of required) {
            if (!this.intent[field as keyof Intent]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
    }
}
