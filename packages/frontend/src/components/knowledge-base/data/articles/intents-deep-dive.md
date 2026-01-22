---
id: understanding-intents
categoryId: features
title: Deep Dive: How Intent Swaps Work
summary: A technical look at the lifecycle of an intent, from signing to Dutch Auction settlement.
date: Jan 21, 2026
author: Antony
readTime: 5 min read
tags: technical, intents, dutch auction
---

# The Lifecycle of an Intent

When you place a Market Order on Intent Protocol, you aren't just sending a simple transaction. You are initiating a sophisticated Dutch Auction mechanism designed to find the fair market price for your asset.

This lifecycle ensures that **Solvers** (Relayers) are incentivized to give you the best price possible.

## 1. Quote & Construction

When you enter `100 MOVE` into the swap interface, the frontend queries an Oracle (like Pyth) to get the current reference price. Let's say 1 MOVE = 1 USDC.

The app constructs an **Intent** with a decaying price curve:
*   **Start Price**: High Premium (e.g., you ask for 105 USDC).
*   **End Price**: Limit Price (e.g., you accept 99 USDC).
*   **Duration**: e.g., 5 minutes.

You sign this entire curve as a single EIP-712 message.

## 2. The Dutch Auction

Once signed, your intent is broadcast to the Relayer network. It is **not** on-chain yet.

Relayers monitor your order off-chain. As time passes, the "required output" for your order decreases according to the curve you signed.

| Time | Required Output | Market Value | Status |
| :--- | :--- | :--- | :--- |
| **T+0s** | 105 USDC | 100 USDC | **Unprofitable** for Relayer |
| **T+1s** | 104 USDC | 100 USDC | Unprofitable |
| **T+3s** | 101 USDC | 100 USDC | Close to Fair |
| **T+5s** | 99.8 USDC | 100 USDC | **Profitable!** (Relayer earns +0.2 USDC) |

## 3. Settlement

The moment the curve crosses the market price (plus the Relayer's fee), the fastest Relayer grabs your intent.

They construct a transaction that:
1.  Pulls `100 MOVE` from your wallet (authorized by your signature).
2.  Sends `99.8 USDC` to your wallet (from the Relayer's own funds).
3.  Submits strictly to the `IntentSwap` contract.

**Atomic Safety**: The Move smart contract verifies that **both** transfers happen in the same transaction. If the Relayer doesn't pay you, they can't take your MOVE.

## 4. Finality

The transaction is confirmed on the Movement blockchain. You receive your funds, the Relayer gets the assets to rebalance their inventory, and the intent is marked as "Filled".
