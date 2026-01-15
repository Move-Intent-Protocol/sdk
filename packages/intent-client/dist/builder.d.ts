import { SignedIntent } from '@intent-protocol/common';
export type Signer = (message: Uint8Array) => Promise<string>;
export declare class IntentBuilder {
    private signer;
    private intent;
    constructor(signer: Signer);
    setMaker(maker: string): this;
    setNonce(nonce: string | number): this;
    setSellToken(token: string): this;
    setBuyToken(token: string): this;
    setSellAmount(amount: string | number): this;
    setStartBuyAmount(amount: string | number): this;
    setEndBuyAmount(amount: string | number): this;
    setStartTime(time: string | number): this;
    setEndTime(time: string | number): this;
    build(): Promise<SignedIntent>;
    private validate;
}
