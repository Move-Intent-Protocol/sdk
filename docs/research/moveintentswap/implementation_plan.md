# Implementation Plan - Multi-Token Escrow Support

## Goal
Update the `SwapContext` and `SwapCard` components to support depositing and managing multiple tokens (MOVE, WETH.e, USDC.e, USDT.e) in the escrow system, as requested by the user.

## User Review Required
> [!IMPORTANT]
> The contract uses generic `Coin<CoinType>`. The user provided `faAddress` (Fungible Asset) but empty `coinType`. Standard `Coin` modules require a fully qualified struct tag (e.g. `0x1::aptos_coin::AptosCoin`).
> **Action**: I will update the UI to allow selecting all tokens. For the interaction, I will use `0x1::aptos_coin::AptosCoin` for MOVE. For other tokens, I will map them to known Testnet Coin Types if available, or keep them broken on-chain until the correct Struct Tags are provided, but the UI will natively support the selection.

## Proposed Changes

### Configuration
1.  **`src/lib/config.ts` & `src/components/intent-swap/forms/TokenSelector.tsx`**:
    - Update `TOKENS` array with the user-provided list.
    - Note: The User provided `faAddress`. I will add this field.

### `SwapContext.tsx`
1.  **State**: Change `escrowBalance` to `Record<string, number>` (Map of Type -> Balance).
2.  **`refreshBalance`**:
    - Iterate through `TOKENS`.
    - Call `get_balance` for each token type.
    - Store results.
3.  **`depositToEscrow`**:
    - existing function takes `tokenType`. Ensure it works for all.

### `SwapCard.tsx` / `EscrowDeposit` Component
1.  **Selection**: Add a token selector for the deposit action (if not already present).
2.  **Display**: Show balances for all tokens in the Escrow Dashboard (likely in `SwapPage.tsx` or a new component).

## Verification Plan

### Manual Verification
1.  **UI**: Check the Deposit section. It should allow selecting WETH.e, USDC.e, etc.
2.  **Balances**: The Escrow Balance section should list all 4 tokens with their respective balances (initially 0).
3.  **Functionality**: Try to "Deposit" MOVE (since it works). For others, click deposit (it might fail on chain if types are wrong, but UI should handle the request).
