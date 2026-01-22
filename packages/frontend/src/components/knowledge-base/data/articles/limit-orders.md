---
id: limit-orders
categoryId: features
title: Using Limit Orders
summary: Master permissionless limit orders to buy or sell at your exact price target.
date: Jan 21, 2026
author: Antony
readTime: 4 min read
tags: limit orders, trading, features
---

# Non-Custodial Limit Orders

Intent Protocol introduces a safer, more efficient way to trade: **Non-Custodial Limit Orders**.

## How it differs from CEXs

On a Centralized Exchange (CEX) like Binance or Coinbase, to place a limit order, you must first deposit detailed funds into their wallet.
*   **Risk**: If the exchange is hacked or goes insolvent, your funds are lost.
*   **Lockup**: You cannot use those funds elsewhere while the order is open.

On **Intent Protocol**, your funds stay in **your wallet** (or your personal non-custodial escrow account) until the order is actually filled.

## The Mechanism

Limit Orders working similarly to Swaps, but with a **fixed price** instead of a decaying auction.

1.  **Creation**: You define that you want to sell `1 ETH` for exactly `2000 USDC`.
2.  **Signing**: You sign an intent with a long expiration (e.g., 7 days).
3.  **Storage**: The intent sits in the off-chain Order Book.
4.  **Execution**: When the market price of ETH hits $2000, a Relayer executes your order.

## Step-by-Step Guide

### 1. Placing the Order
Navigate to the **Limit** tab on the Trade interface.
*   Select the token you want to sell.
*   Select the token you want to buy.
*   Enter the specific exchange rate or output amount you desire.
*   **Tip**: Use the "Current Market Price" button to auto-fill, then adjust your target manually.

### 2. Managing Orders
You can view your active Limit Orders in the **"Open Limit Orders"** section of the Dashboard (or Resolver page).
To cancel, simply click **"Cancel"**. This requires a small gas fee to invalidate the signature on-chain (nonce increment), protecting you from old orders being filled later.

### 3. Execution
You don't need to stay online. Once the price is hit, the Relayer network will execute your trade automatically.
