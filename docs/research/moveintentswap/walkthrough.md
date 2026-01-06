# E2E Swap Verification

## Executive Summary
The end-to-end swap flow was **successful on-chain**. The user (Maker) successfully swapped 1.00 MOVE (Sell Token) for 1.05 MOVE (Buy Token).

- **User**: `0x997dbc8cd7ca1a472e115dd3e2d884eb5b1e98833a7de2c783a7837ead75f4c9`
- **Transaction Hash**: [`0x1946f6da2bbc0bed4c7da117d75110c75ff27927e3cf52d9da8bdde10c72c49f`](https://testnet.movementnetwork.xyz/txn/0x1946f6da2bbc0bed4c7da117d75110c75ff27927e3cf52d9da8bdde10c72c49f)
- **Status**: Success

## Token Flow Verification
The transaction logs confirm the following transfers:

1. **Sell Side**: `100,000,000` (1.00 APT/MOVE) was transferred from the User's Escrow to the Relayer/Contract.
   - Event: `0xbd12...::escrow::EscrowTransfer`
   - Amount: `100000000`
   - From: `0x997d...` (User)
   - To: `0xbd12...` (Contract)

2. **Buy Side**: `105,000,000` (1.05 APT/MOVE) was deposited into the User's Wallet.
   - Event: `0x1::coin::DepositEvent`
   - Amount: `105000000`
   - To: `0x997d...` (User)

**Result**: The user correctly received the proceeds of the swap.

## UI/Frontend Issues Identified
While the blockchain transaction succeeded, the frontend UI has two potential display issues:

1. **Escrow Balance Display**:
   - The frontend logs suggest the Escrow Balance remained at `9.4` before and after the transaction.
   - On-chain data confirms the current balance is `9.4` (940000000).
   - Logic dictates the pre-transaction balance must have been `10.4` for the math to work (10.4 - 1.0 = 9.4).
   - The frontend likely cached or fetched the `9.4` value (possibly from a previous state or race condition) causing the confusion.

2. **Order Status**:
   - The frontend marked the order as `CANCELLED` locally.
   - This occurs because `is_order_filled` returned false (or failed), causing the fallback logic to check the nonce.
   - Since the transaction incremented the nonce, the frontend logic `nonce < currentNonce` triggered the cancelled state.
   - Recommendation: Investigate the `is_order_filled` view function or improved event indexing.
