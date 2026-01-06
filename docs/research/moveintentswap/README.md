# Movement Intent Swap

Intent-based token swapping system for Movement Network - native tokens only.

## Documents

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and design |
| [TECH_STACK.md](./TECH_STACK.md) | **Move 2.0 smart contract tech stack** |
| [SMART_CONTRACTS.md](./SMART_CONTRACTS.md) | Move module specifications |
| [RELAYER_DESIGN.md](./RELAYER_DESIGN.md) | Off-chain relayer implementation |
| [RESOLVERS.md](./RESOLVERS.md) | Resolver guide with dashboard UI |
| [USER_GUIDE.md](./USER_GUIDE.md) | User guide with swap UI |
| [USER_FLOW.md](./USER_FLOW.md) | Frontend integration code |
| [EXAMPLES.md](./EXAMPLES.md) | Detailed examples in action |
| [PRICE_ORACLE.md](./PRICE_ORACLE.md) | Price feed considerations (Pyth) |

## Overview

A gasless, MEV-protected swap system where:
- Users sign intents off-chain
- Relayers compete to fill orders via Dutch auction
- Settlement happens atomically on Movement

## Key Differences from Cross-Chain

| Aspect | Cross-Chain (Fusion+) | Movement-Only |
|--------|----------------------|---------------|
| Escrow | HTLCs on both chains | Single escrow contract |
| Finality | Wait for both chains | ~2-3 seconds |
| Complexity | High (secrets, timelocks) | Lower |
| Atomic via | HTLC secret reveal | Single transaction |

## Quick Start

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview
2. Review [SMART_CONTRACTS.md](./SMART_CONTRACTS.md) for Move modules
3. Understand [RELAYER_DESIGN.md](./RELAYER_DESIGN.md) for off-chain components
