# Intent Protocol Common

Shared library containing core type definitions and cryptographic utilities for the Movement Intent Swap protocol.

## Installation

```bash
npm install @intent-protocol/common
```

## Modules

### Types
Core interfaces used across the ecosystem.

```typescript
import { Intent, SignedIntent, Order } from '@intent-protocol/common';
```

### Crypto
Utilities for hashing intents and validating data.

```typescript
import { computeIntentHash, hexToBytes } from '@intent-protocol/common';

const hash = computeIntentHash(intent);
```

**Note**: This package is primarily a dependency for `@intent-protocol/client` and `@intent-protocol/resolver`.
