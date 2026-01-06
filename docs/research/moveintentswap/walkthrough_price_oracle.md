# Multi-Token Price Oracle Support

## Updates
- **Price Mappings**: Updated `packages/frontend/src/lib/pyth.ts` to map the new testnet tokens to existing Pyth price feeds:
    - `WETH.e` -> `ETH` Feed
    - `USDC.e` -> `USDC` Feed
    - `USDT.e` -> `USDT` Feed

## Verification
- **Code**: `SwapCard.tsx` consumes `PriceService` which now resolves these keys correctly.
- **UI**: The "You receive" amount should now automatically calculate based on real-time prices (or latest available Pyth prices) for these tokens.
