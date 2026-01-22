---
id: intro-intent-protocol
categoryId: getting-started
title: Introduction to Intent Protocol
summary: Discover the next generation of DeFi interaction where you express what you want, not how to execute it.
date: Jan 21, 2026
author: Antony
readTime: 3 min read
tags: getting started, intents, defi
---

# What is Intent Protocol?

Intent Protocol is a revolutionary DeFi platform built on the Movement blockchain. Unlike traditional Decentralized Exchanges (DEXs) where you execute specific transactions against a smart contract, Intent Protocol allows you to sign an **Intent**—a declaration of your desired outcome.

## The Problem with Current DEXs

In the current DeFi landscape, users are often forced to be "transaction builders". You have to:
1.  Check the best route.
2.  Approve token spending.
3.  Set slippage tolerance (often guessing).
4.  Submit the swap transaction and pay gas.
5.  Wait for confirmation.

If the transaction fails, you pay gas anyway. If you get front-run (MEV), you get a worse price.

## The Intent Solution

With Intent Protocol, you don't build transactions; you express **outcomes**.

> "I want to exchange 100 MOVE for at least 150 USDC."

You sign this statement cryptographically. That's it. You don't pay gas to post it. You don't worry about routing.

## Key Benefits

### 1. Gasless Experience
Makers (users) only sign messages (EIP-712). Solvers (relayers) pay the actual gas fees to execute the swap on-chain. If your order isn't filled, it costs you nothing.

### 2. MEV Protection
By defining your exact output minimum, you protect yourself from front-running and sandwich attacks. Your trade cannot be executed at a worse price than what you signed.

### 3. Best Execution
Relayers compete to fill your order. They monitor liquidity across multiple sources (DEXs, CEXs, OTC) to bring you the best possible price.

## How to Use

1.  **Connect Wallet**: Link your Movement-compatible wallet.
2.  **Select Tab**: Choose 'Market' for instant swaps or 'Limit' for precise price targeting.
3.  **Enter Amounts**: Type how much you want to sell.
4.  **Sign Intent**: Click 'Swap' or 'Place Order' and sign the message in your wallet.
5.  **Relax**: Watch as your intent is picked up by a relayer and executed instantly.
