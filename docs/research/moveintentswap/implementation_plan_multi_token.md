# Multi-Token and Relayer Implementation Plan

## Goal
Enable the Intent Swap system to support trading `WETH.e`, `USDC.e`, and `USDT.e` against `MOVE`.
**CRITICAL UPDATE**: The bridged tokens (`USDC.e`, etc.) on Movement Bardock Testnet are **pure Fungible Assets (FA)** without paired Coin modules. The existing Move contracts (`escrow.move` and `swap.move`) utilize the `aptos_framework::coin` module which requires generic type instantiation. To support these tokens, the contracts must be upgraded to support `aptos_framework::fungible_asset`.

## User Review Required
> [!IMPORTANT]
> **Contract Upgrade Required**: The current contracts only support legacy "Coins". To support the new bridged tokens, we must deploy updated `escrow` and `swap` modules that handle raw `FungibleAssets`.
> **Relayer Funding**: Ensure `0xbd128d4f1dbb87783658bed4a4046f3811015952110f321863c34f161eb07611` is funded with the assets it needs to sell (e.g. USDC.e).

## Proposed Changes

### Move Contracts (`packages/intent-swap`)
#### [MODIFY] [escrow.move](file:///home/antony/intent-protocol/packages/intent-swap/sources/escrow.move)
*   Import `aptos_framework::fungible_asset` and `aptos_framework::primary_fungible_store`.
*   Add `struct UserEscrowFA` to map FA metadata objects to user balances (or piggyback on `PrimaryFungibleStore`).
*   Add `public entry fun deposit_fa(user: &signer, amount: u64, metadata: Object<Metadata>)`.
*   Add `public(friend) fun transfer_from_escrow_fa(...)`.

#### [MODIFY] [swap.move](file:///home/antony/intent-protocol/packages/intent-swap/sources/swap.move)
*   Add `entry fun fill_order_v3(...)` that takes object addresses instead of type arguments.
*   Update validation logic to check `metadata` addresses against intent fields instead of generic type names.

### Frontend
#### [MODIFY] [TokenSelector.tsx](file:///home/antony/intent-protocol/packages/frontend/src/components/intent-swap/forms/TokenSelector.tsx)
*   Ensure types are identified correctly (e.g., prefix with `fa:` for FA addresses vs `struct` for Coins).

#### [MODIFY] [SwapContext.tsx](file:///home/antony/intent-protocol/packages/frontend/src/context/SwapContext.tsx)
*   Update `depositToEscrow` to call `deposit_fa` if the token is an FA.

### Relayer
*   Update `Relayer.ts` to call `fill_order_v3` (or adaptive logic) when `buy_token` or `sell_token` is an FA.

## Verification Plan
1.  **Deploy Upgraded Contracts**.
2.  **Frontend Deposit**: Deposit `USDC.e` (FA) into Escrow.
3.  **Swap Execution**: Swap `USDC.e` -> `MOVE`.
