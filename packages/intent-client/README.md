# Intent Client SDK

The **Intent Client SDK** provides tools for frontends and wallets to construct, sign, and submit swap intents to the Movement Intent Swap protocol.

## Installation

```bash
npm install @intent-protocol/client
```

## Usage

### 1. Initialize API

```typescript
import { IntentAPI } from '@intent-protocol/client';

const api = new IntentAPI('https://api.intent.movement/v1');
```

### 2. Build and Sign an Intent

```typescript
import { IntentBuilder } from '@intent-protocol/client';

// Your wallet's signing function (e.g., from Aptos wallet adapter)
const signer = async (message: Uint8Array) => {
  return await wallet.signMessage(message);
};

const builder = new IntentBuilder(signer);

const intent = await builder
  .setMaker('0xUserAddress')
  .setNonce(Date.now())
  .setSellToken('0x1::aptos_coin::AptosCoin')
  .setBuyToken('0xUSDC')
  .setSellAmount(1000000)
  .setStartBuyAmount(1000000) // Initial price
  .setEndBuyAmount(990000)    // Lowest acceptable price (Dutch auction)
  .setStartTime(Date.now() / 1000)
  .setEndTime((Date.now() / 1000) + 300) // Valid for 5 mins
  .build();
```

### 3. Submit Order

```typescript
const order = await api.submitOrder(intent);
console.log('Order created:', order.id);
```
