"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentBuilder = void 0;
const common_1 = require("@intent-protocol/common");
class IntentBuilder {
    constructor(signer) {
        this.signer = signer;
        this.intent = {};
    }
    setMaker(maker) {
        this.intent.maker = maker;
        return this;
    }
    setNonce(nonce) {
        this.intent.nonce = nonce.toString();
        return this;
    }
    setSellToken(token) {
        this.intent.sellToken = token;
        return this;
    }
    setBuyToken(token) {
        this.intent.buyToken = token;
        return this;
    }
    setSellAmount(amount) {
        this.intent.sellAmount = amount.toString();
        return this;
    }
    setStartBuyAmount(amount) {
        this.intent.startBuyAmount = amount.toString();
        return this;
    }
    setEndBuyAmount(amount) {
        this.intent.endBuyAmount = amount.toString();
        return this;
    }
    setStartTime(time) {
        this.intent.startTime = time.toString();
        return this;
    }
    setEndTime(time) {
        this.intent.endTime = time.toString();
        return this;
    }
    async build() {
        this.validate();
        // Create complete intent object
        const finalIntent = this.intent;
        // Hash
        const hash = (0, common_1.computeIntentHash)(finalIntent);
        // Sign
        const signature = await this.signer(hash);
        return {
            ...finalIntent,
            signature
        };
    }
    validate() {
        const required = [
            'maker', 'nonce', 'sellToken', 'buyToken',
            'sellAmount', 'startBuyAmount', 'endBuyAmount',
            'startTime', 'endTime'
        ];
        for (const field of required) {
            if (!this.intent[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
    }
}
exports.IntentBuilder = IntentBuilder;
