# 1inch Fusion Research

Research documentation for implementing intent-based swaps on Movement, inspired by 1inch's Fusion mechanism.

## Documents

| Document | Description |
|----------|-------------|
| [FUSION_SWAP_NOTES.md](./FUSION_SWAP_NOTES.md) | Overview of Fusion Swap architecture, resolvers, Dutch auction |
| [CROSS_CHAIN_TECHNICAL.md](./CROSS_CHAIN_TECHNICAL.md) | Technical deep dive on Fusion+ HTLC cross-chain swaps |

## Key Concepts

- **Intent-based trading**: Users sign desired outcomes, not execution paths
- **Resolvers**: Professional market makers who execute trades and pay gas
- **Dutch Auction**: Price discovery mechanism for fair pricing
- **Fusion+**: Cross-chain swaps using HTLCs (no bridges)

## Application to Movement

The research informs how to implement:
1. Intent signing on Movement
2. Relayer/resolver competition
3. Cross-chain atomic swaps (Movement ↔ EVM)
4. Gasless user experience
