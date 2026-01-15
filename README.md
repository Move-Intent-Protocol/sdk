# Movement Intent SDK

> **Official TypeScript SDKs for the Movement Intent Swap Protocol**

This monorepo contains the core packages for building intent-based swaps on the Movement Network.

## 📦 Packages

| Package | Description | npm |
| :--- | :--- | :--- |
| [`@intent-protocol/common`](./packages/intent-common) | Shared types and crypto utilities | [![npm](https://img.shields.io/npm/v/@intent-protocol/common)](https://www.npmjs.com/package/@intent-protocol/common) |
| [`@intent-protocol/client`](./packages/intent-client) | Frontend SDK for building & signing intents | [![npm](https://img.shields.io/npm/v/@intent-protocol/client)](https://www.npmjs.com/package/@intent-protocol/client) |
| [`@intent-protocol/resolver`](./packages/intent-resolver) | Relayer SDK for fetching & filling orders | [![npm](https://img.shields.io/npm/v/@intent-protocol/resolver)](https://www.npmjs.com/package/@intent-protocol/resolver) |

## 🚀 Quick Start

### For Frontend/dApp Developers

```bash
npm install @intent-protocol/client
```

```typescript
import { IntentBuilder, IntentAPI } from '@intent-protocol/client';

const builder = new IntentBuilder(signer);
const intent = await builder
  .setMaker('0x...')
  .setSellToken('MOVE')
  .setBuyToken('USDC')
  .setSellAmount(100)
  .build();

const api = new IntentAPI('https://api.intent.movement');
await api.submitOrder(intent);
```

### For Relayers/Solvers

```bash
npm install @intent-protocol/resolver
```

```typescript
import { ResolverAPI, OrderValidator } from '@intent-protocol/resolver';

const api = new ResolverAPI('https://api.intent.movement');
const orders = await api.getOpenOrders({ sellToken: 'MOVE' });

for (const order of orders) {
  if (!OrderValidator.isExpired(order.intent)) {
    // Fill order on-chain
  }
}
```

## 📄 License

MIT
