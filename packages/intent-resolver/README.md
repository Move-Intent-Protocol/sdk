# Intent Resolver SDK

The **Intent Resolver SDK** provides tools for Relayers and Solvers to fetch, validate, and fill orders from the Movement Intent Swap protocol.

## Installation

```bash
npm install @intent-protocol/resolver
```

## Usage

### 1. Initialize API

```typescript
import { ResolverAPI } from '@intent-protocol/resolver';

const api = new ResolverAPI('https://api.intent.movement/v1');
```

### 2. Poll for Open Orders

```typescript
import { OrderFilter } from '@intent-protocol/resolver';

const filter: OrderFilter = {
  status: 'open',
  // Optional: filter by token pair
  sellToken: '0x...AptosCoin',
  buyToken: '0x...USDC'
};

const orders = await api.getOpenOrders(filter);

for (const order of orders) {
  console.log('Found order:', order.id, 'Maker:', order.maker);
}
```

### 3. Validate Order Integrity

```typescript
import { OrderValidator } from '@intent-protocol/resolver';

for (const order of orders) {
  // Check if order is expired
  if (OrderValidator.isExpired(order.intent)) {
    console.log('Order expired:', order.id);
    continue;
  }
  
  // Verify hash/signature structure (basic check)
  if (OrderValidator.validateHash(order.intent)) {
     console.log('Order valid, attempting to fill...');
     // ... Calculate profit and execute transaction on-chain
  }
}
```
