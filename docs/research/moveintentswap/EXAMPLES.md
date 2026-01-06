# Movement Intent Swap - Examples in Action

> Detailed end-to-end examples showing the intent swap system working.

---

## Example 1: Simple MOVE → USDC Swap

### Scenario
Alice wants to swap 100 MOVE for USDC. She's willing to accept a 0.5% slippage.

### Step 1: Alice Deposits to Escrow

```typescript
// Alice deposits MOVE to the escrow contract
const tx = await aptos.transaction.build.simple({
  sender: aliceAddress,
  data: {
    function: `${INTENT_SWAP}::escrow::deposit`,
    typeArguments: ['0x1::aptos_coin::AptosCoin'],
    functionArguments: ['10000000000'], // 100 MOVE (8 decimals)
  },
});

// Alice signs and submits (pays gas for deposit only)
await wallet.signAndSubmitTransaction(tx);
```

**On-chain state:**
```
Escrow[Alice][MOVE] = 100.00000000
```

---

### Step 2: Alice Creates & Signs Intent

```typescript
// Current market: 1 MOVE = 0.85 USDC
const marketRate = 0.85;
const sellAmount = 100 * 1e8;  // 100 MOVE
const expectedUsdc = 100 * marketRate * 1e6; // 85 USDC (6 decimals)
const minUsdc = expectedUsdc * 0.995; // 0.5% slippage → 84.575 USDC

const intent = {
  maker: '0xAlice...abc',
  nonce: 0n,
  sellToken: '0x1::aptos_coin::AptosCoin',          // MOVE
  buyToken: '0xUSDC::usdc::USDC',                   // USDC
  sellAmount: 10000000000n,                          // 100 MOVE
  startBuyAmount: 85000000n,                         // 85 USDC (start)
  endBuyAmount: 84575000n,                           // 84.575 USDC (min)
  startTime: 1704729600n,                            // Jan 8, 2026, 19:00:00
  endTime: 1704729900n,                              // +5 minutes
};

// Compute hash (matches Move contract)
const intentHash = sha3_256([
  'MOVE_INTENT_SWAP_V1',
  bcs.serialize(intent)
]);

// Alice signs (gasless - just a signature)
const signature = await wallet.signMessage(intentHash);

const signedIntent = { ...intent, signature };
```

**What Alice sees:**
```
┌─────────────────────────────────────────────┐
│  SWAP                                       │
├─────────────────────────────────────────────┤
│  You Pay:     100 MOVE                      │
│  You Receive: ~85 USDC                      │
│  Slippage:    0.5% (min 84.575 USDC)        │
│  Network Fee: FREE (covered by relayer)    │
│                                             │
│  [Sign Intent]                              │
└─────────────────────────────────────────────┘
```

---

### Step 3: Submit to Order Book

```typescript
// Frontend submits to off-chain order book
const response = await fetch('https://orderbook.moveswap.xyz/orders', {
  method: 'POST',
  body: JSON.stringify(signedIntent),
});

const order = await response.json();
// { id: 'order_123', status: 'open', createdAt: 1704729600 }
```

**Order Book state:**
```json
{
  "orders": [
    {
      "id": "order_123",
      "intent": { /* Alice's intent */ },
      "status": "open",
      "createdAt": 1704729600
    }
  ]
}
```

---

### Step 4: Relayers Compete

Three relayers are monitoring the order book:

```
Time: 19:00:00 (auction start)
┌────────────┬──────────────┬────────────────┬───────────────┐
│ Relayer    │ Has USDC?    │ Required Bid   │ Profitable?   │
├────────────┼──────────────┼────────────────┼───────────────┤
│ Relayer A  │ 200 USDC ✓   │ 85.00 USDC     │ ❌ Too early  │
│ Relayer B  │ 150 USDC ✓   │ 85.00 USDC     │ ❌ Too early  │
│ Relayer C  │ 50 USDC ✗    │ 85.00 USDC     │ ❌ No funds   │
└────────────┴──────────────┴────────────────┴───────────────┘
```

**Dutch auction price at t=0:** 85 USDC (no profit margin)

---

### Step 5: Price Decreases (Dutch Auction)

```
Time: 19:02:30 (2.5 minutes in, 50% elapsed)

Current Required USDC = 85 - (85 - 84.575) * 0.5 = 84.7875 USDC

┌────────────┬──────────────┬────────────────┬───────────────┐
│ Relayer    │ Has USDC?    │ Required Bid   │ Profitable?   │
├────────────┼──────────────┼────────────────┼───────────────┤
│ Relayer A  │ 200 USDC ✓   │ 84.7875 USDC   │ ✅ +0.21 USDC │
│ Relayer B  │ 150 USDC ✓   │ 84.7875 USDC   │ ✅ +0.21 USDC │
└────────────┴──────────────┴────────────────┴───────────────┘

Relayer A decides to fill! Profit = 100 MOVE worth - 84.7875 USDC paid - gas
```

---

### Step 6: Relayer A Fills the Order

```typescript
// Relayer A submits fill transaction
const fillTx = await aptos.transaction.build.simple({
  sender: relayerAAddress,
  data: {
    function: `${INTENT_SWAP}::swap::fill_order`,
    typeArguments: [
      '0x1::aptos_coin::AptosCoin',  // SellCoin (MOVE)
      '0xUSDC::usdc::USDC',          // BuyCoin (USDC)
    ],
    functionArguments: [
      '0xAlice...abc',    // maker
      '0',                // nonce
      '10000000000',      // sell_amount (100 MOVE)
      '85000000',         // start_buy_amount
      '84575000',         // end_buy_amount
      '1704729600',       // start_time
      '1704729900',       // end_time
      '84787500',         // buy_amount (paying 84.7875 USDC)
      '0xSignature...',   // Alice's signature
    ],
  },
});

// Relayer A signs and submits (pays gas ~0.005 MOVE)
const result = await aptos.signAndSubmitTransaction({
  signer: relayerAAccount,
  transaction: fillTx,
});

// TX Hash: 0xabc123...
```

---

### Step 7: Atomic Settlement

**What happens in the `fill_order` function:**

```move
// 1. Verify timing ✓
assert!(now >= start_time && now <= end_time);  // 19:02:30 is valid

// 2. Calculate required buy amount ✓
// required = 85 - (85 - 84.575) * 150 / 300 = 84.7875
let required = calculate_buy_amount(...);

// 3. Check relayer's offer ✓
assert!(84.7875 >= 84.7875);  // Relayer is paying exactly required

// 4. Verify signature ✓
let valid = verify_intent_signature(intent, signature, alice);

// 5. Check nonce ✓
assert!(get_nonce(alice) == 0);

// 6. Execute transfers
// Alice's escrow → Relayer A: 100 MOVE
transfer_from_escrow<MOVE>(alice, relayer_a, 100_00000000);

// Relayer A → Alice: 84.7875 USDC
coin::withdraw<USDC>(relayer_a, 84_787500);
coin::deposit(alice, usdc_coins);

// 7. Update state
mark_filled(order_hash);
increment_nonce(alice);  // Now alice.nonce = 1

// 8. Emit event
emit(OrderFilled { maker: alice, relayer: relayer_a, ... });
```

---

### Step 8: Final Balances

```
┌────────────────────────────────────────────────────────────┐
│  BEFORE                         AFTER                       │
├──────────────────────────┬─────────────────────────────────┤
│  Alice:                  │  Alice:                         │
│    Wallet: 0 MOVE        │    Wallet: 0 MOVE               │
│    Escrow: 100 MOVE      │    Escrow: 0 MOVE               │
│    USDC: 0               │    USDC: 84.7875 ✨             │
│                          │                                 │
│  Relayer A:              │  Relayer A:                     │
│    MOVE: 0               │    MOVE: 100 ✨                 │
│    USDC: 200             │    USDC: 115.2125               │
│    (paid ~0.005 gas)     │    Net profit: ~0.21 USDC       │
└──────────────────────────┴─────────────────────────────────┘
```

**Alice's experience:**
- ✅ Signed once (no gas)
- ✅ Received 84.7875 USDC
- ✅ Better than minimum (84.575)
- ✅ Total cost: $0 in fees

---

## Example 2: Order Expires (No Fill)

### Scenario
Bob tries to swap 50 MOVE for USDC with very tight slippage (0.1%).

```typescript
const intent = {
  maker: '0xBob...def',
  nonce: 0n,
  sellToken: MOVE,
  buyToken: USDC,
  sellAmount: 5000000000n,      // 50 MOVE
  startBuyAmount: 42500000n,    // 42.5 USDC
  endBuyAmount: 42457500n,      // 42.4575 USDC (0.1% slippage)
  startTime: 1704730000n,
  endTime: 1704730300n,         // 5 minutes
};
```

### Timeline

```
19:06:40 - Order created
  │
19:07:00 - Relayers check: margin too small (0.04 USDC max profit)
  │         Gas cost: ~0.05 MOVE (~0.04 USDC)
  │         Result: Not profitable ❌
  │
19:08:00 - Price drops to 42.48 USDC
  │         Still not profitable ❌
  │
19:11:40 - ORDER EXPIRES
  │
  └─► Bob's escrow untouched, can create new order with wider slippage
```

**Bob sees:**
```
┌─────────────────────────────────────────────┐
│  ORDER EXPIRED                              │
├─────────────────────────────────────────────┤
│  No relayer filled your order.              │
│  Try widening your slippage tolerance.      │
│                                             │
│  [Create New Order]                         │
└─────────────────────────────────────────────┘
```

---

## Example 3: Multiple Orders Batched

### Scenario
Relayer optimizes by filling 3 orders in one transaction.

```
Active Orders:
┌────────┬────────┬──────────┬──────────┬─────────────┐
│ Order  │ Maker  │ Sell     │ Buy      │ Req. Amount │
├────────┼────────┼──────────┼──────────┼─────────────┤
│ #101   │ Alice  │ 100 MOVE │ USDC     │ 84.50 USDC  │
│ #102   │ Carol  │ 200 MOVE │ USDC     │ 168.80 USDC │
│ #103   │ Dave   │ 50 MOVE  │ USDC     │ 42.10 USDC  │
└────────┴────────┴──────────┴──────────┴─────────────┘

Total: 350 MOVE → 295.40 USDC needed
```

### Batch Fill Transaction

```typescript
const batchTx = await aptos.transaction.build.simple({
  sender: relayerAddress,
  data: {
    function: `${INTENT_SWAP}::swap::batch_fill`,
    typeArguments: ['0x1::aptos_coin::AptosCoin', '0xUSDC::usdc::USDC'],
    functionArguments: [
      [intent1, intent2, intent3],           // intents array
      [signature1, signature2, signature3],  // signatures array
      [84500000n, 168800000n, 42100000n],    // buy_amounts array
    ],
  },
});

// Single TX, single gas payment
const result = await aptos.signAndSubmitTransaction({ signer: relayer, transaction: batchTx });
```

**Gas savings:**
```
Individual fills: 3 × 0.005 MOVE = 0.015 MOVE
Batched fill:     1 × 0.008 MOVE = 0.008 MOVE
Savings:          ~47%
```

---

## Example 4: Order Cancellation

### Scenario
Alice created an order but market moved against her. She wants to cancel.

```typescript
// Alice calls cancel (increments nonce, invalidating old orders)
const cancelTx = await aptos.transaction.build.simple({
  sender: aliceAddress,
  data: {
    function: `${INTENT_SWAP}::swap::cancel_order`,
    typeArguments: [],
    functionArguments: [],
  },
});

await wallet.signAndSubmitTransaction(cancelTx);
```

**What happens:**
```
Before: Alice.nonce = 0
        Order #123 has nonce = 0 ✓ (valid)

After:  Alice.nonce = 1
        Order #123 has nonce = 0 ✗ (invalid - nonce mismatch)
```

**If relayer tries to fill:**
```move
// In fill_order:
let current_nonce = get_nonce(alice);  // Returns 1
assert!(intent.nonce == current_nonce);  // 0 != 1
// ERROR: E_INVALID_NONCE
```

---

## Example 5: Full E2E Test Script

```typescript
import { Aptos, AptosConfig, Network, Account } from '@aptos-labs/ts-sdk';
import { sha3_256 } from '@noble/hashes/sha3';

const INTENT_SWAP = '0x123...IntentSwap';

async function main() {
  // Setup
  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);
  
  const maker = Account.generate();
  const relayer = Account.generate();
  
  console.log('Maker:', maker.accountAddress.toString());
  console.log('Relayer:', relayer.accountAddress.toString());
  
  // Fund accounts
  await aptos.fundAccount({ accountAddress: maker.accountAddress, amount: 100_00000000 });
  await aptos.fundAccount({ accountAddress: relayer.accountAddress, amount: 100_00000000 });
  
  // Mint USDC to relayer (for testnet)
  await mintTestUSDC(aptos, relayer, 100_000000);
  
  // ============================================
  // Step 1: Maker deposits to escrow
  // ============================================
  console.log('\n1. Maker deposits 50 MOVE to escrow...');
  
  const depositTx = await aptos.transaction.build.simple({
    sender: maker.accountAddress,
    data: {
      function: `${INTENT_SWAP}::escrow::deposit`,
      typeArguments: ['0x1::aptos_coin::AptosCoin'],
      functionArguments: ['5000000000'], // 50 MOVE
    },
  });
  
  const depositResult = await aptos.signAndSubmitTransaction({
    signer: maker,
    transaction: depositTx,
  });
  await aptos.waitForTransaction({ transactionHash: depositResult.hash });
  console.log('   Deposit TX:', depositResult.hash);
  
  // ============================================
  // Step 2: Maker creates and signs intent
  // ============================================
  console.log('\n2. Maker creates intent for 50 MOVE → USDC...');
  
  const now = Math.floor(Date.now() / 1000);
  const intent = {
    maker: maker.accountAddress.toString(),
    nonce: 0n,
    sellToken: '0x1::aptos_coin::AptosCoin',
    buyToken: `${INTENT_SWAP}::test_usdc::USDC`,
    sellAmount: 5000000000n,     // 50 MOVE
    startBuyAmount: 42500000n,   // 42.5 USDC
    endBuyAmount: 42000000n,     // 42 USDC (min)
    startTime: BigInt(now),
    endTime: BigInt(now + 300),  // 5 minutes
  };
  
  const intentHash = computeIntentHash(intent);
  const signature = maker.sign(intentHash);
  console.log('   Intent hash:', Buffer.from(intentHash).toString('hex'));
  
  // ============================================
  // Step 3: Simulate time passing (2.5 min)
  // ============================================
  console.log('\n3. Simulating Dutch auction (2.5 minutes elapsed)...');
  
  // In real scenario, actual time passes
  // Current price: 42.5 - (42.5 - 42) * 0.5 = 42.25 USDC
  const currentBuyAmount = 42250000n;
  console.log('   Current required: 42.25 USDC');
  
  // ============================================
  // Step 4: Relayer fills the order
  // ============================================
  console.log('\n4. Relayer fills order...');
  
  const fillTx = await aptos.transaction.build.simple({
    sender: relayer.accountAddress,
    data: {
      function: `${INTENT_SWAP}::swap::fill_order`,
      typeArguments: [
        '0x1::aptos_coin::AptosCoin',
        `${INTENT_SWAP}::test_usdc::USDC`,
      ],
      functionArguments: [
        intent.maker,
        intent.nonce.toString(),
        intent.sellAmount.toString(),
        intent.startBuyAmount.toString(),
        intent.endBuyAmount.toString(),
        intent.startTime.toString(),
        intent.endTime.toString(),
        currentBuyAmount.toString(),
        signature.toString(),
      ],
    },
  });
  
  const fillResult = await aptos.signAndSubmitTransaction({
    signer: relayer,
    transaction: fillTx,
  });
  await aptos.waitForTransaction({ transactionHash: fillResult.hash });
  console.log('   Fill TX:', fillResult.hash);
  
  // ============================================
  // Step 5: Verify final balances
  // ============================================
  console.log('\n5. Final balances:');
  
  const makerMOVE = await aptos.getAccountCoinAmount({
    accountAddress: maker.accountAddress,
    coinType: '0x1::aptos_coin::AptosCoin',
  });
  const makerUSDC = await aptos.getAccountCoinAmount({
    accountAddress: maker.accountAddress,
    coinType: `${INTENT_SWAP}::test_usdc::USDC`,
  });
  
  console.log(`   Maker MOVE: ${makerMOVE / 1e8}`);
  console.log(`   Maker USDC: ${makerUSDC / 1e6}`);
  
  const relayerMOVE = await aptos.getAccountCoinAmount({
    accountAddress: relayer.accountAddress,
    coinType: '0x1::aptos_coin::AptosCoin',
  });
  const relayerUSDC = await aptos.getAccountCoinAmount({
    accountAddress: relayer.accountAddress,
    coinType: `${INTENT_SWAP}::test_usdc::USDC`,
  });
  
  console.log(`   Relayer MOVE: ${relayerMOVE / 1e8}`);
  console.log(`   Relayer USDC: ${relayerUSDC / 1e6}`);
  
  console.log('\n✅ Intent swap completed successfully!');
}

function computeIntentHash(intent: any): Uint8Array {
  const encoder = new TextEncoder();
  const data = new Uint8Array([
    ...encoder.encode('MOVE_INTENT_SWAP_V1'),
    ...hexToBytes(intent.maker),
    ...bigintToBytes(intent.nonce),
    ...encoder.encode(intent.sellToken),
    ...encoder.encode(intent.buyToken),
    ...bigintToBytes(intent.sellAmount),
    ...bigintToBytes(intent.startBuyAmount),
    ...bigintToBytes(intent.endBuyAmount),
    ...bigintToBytes(intent.startTime),
    ...bigintToBytes(intent.endTime),
  ]);
  return sha3_256(data);
}

main().catch(console.error);
```

**Expected output:**
```
Maker: 0x1234...abcd
Relayer: 0x5678...efgh

1. Maker deposits 50 MOVE to escrow...
   Deposit TX: 0xaaa...

2. Maker creates intent for 50 MOVE → USDC...
   Intent hash: 7f8a3b...

3. Simulating Dutch auction (2.5 minutes elapsed)...
   Current required: 42.25 USDC

4. Relayer fills order...
   Fill TX: 0xbbb...

5. Final balances:
   Maker MOVE: 50.00  (deposit refunded: 0, but original 100 - deposit gas)
   Maker USDC: 42.25  ✨
   Relayer MOVE: 150.00  (received 50 from swap)
   Relayer USDC: 57.75  (100 - 42.25 paid)

✅ Intent swap completed successfully!
```

---

## Example 6: Race Condition - Two Relayers Fill Same Order

### Scenario
Both Relayer A and Relayer B see Alice's profitable order at the same time and submit fill transactions simultaneously.

```
Time: 19:02:30
┌────────────────────────────────────────────────────────────┐
│  ORDER #123 (Alice: 100 MOVE → USDC)                       │
│  Required: 84.7875 USDC | Profit margin: ~0.21 USDC        │
├────────────────────────────────────────────────────────────┤
│  ⚡ Relayer A: "This looks profitable, filling now!"       │
│  ⚡ Relayer B: "This looks profitable, filling now!"       │
└────────────────────────────────────────────────────────────┘
```

### Timeline

```
19:02:30.100 - Relayer A submits TX_A
19:02:30.150 - Relayer B submits TX_B
               │
               ▼
         ┌─────────────────┐
         │   MEMPOOL       │
         │  TX_A, TX_B     │
         └────────┬────────┘
                  │
         Block 1000 (processed ~19:02:32)
         Validator includes BOTH transactions
```

### What Happens On-Chain

**Block 1000 executes transactions sequentially (atomic):**

```
┌─────────────────────────────────────────────────────────────────────┐
│  TRANSACTION ORDER IN BLOCK 1000                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TX_A (Relayer A) - Position 42 in block                           │
│  ├─ 1. Check order not filled     → ✓ is_filled(hash) = false      │
│  ├─ 2. Check nonce                → ✓ alice.nonce = 0              │
│  ├─ 3. Verify signature           → ✓ valid                        │
│  ├─ 4. Transfer: Alice → A        → 100 MOVE ✓                     │
│  ├─ 5. Transfer: A → Alice        → 84.7875 USDC ✓                 │
│  ├─ 6. mark_filled(order_hash)    → Registry[hash] = true ✓        │
│  ├─ 7. increment_nonce(alice)     → alice.nonce = 1 ✓              │
│  └─ RESULT: ✅ SUCCESS                                              │
│                                                                     │
│  TX_B (Relayer B) - Position 43 in block                           │
│  ├─ 1. Check order not filled     → ❌ is_filled(hash) = TRUE!     │
│  │                                                                  │
│  └─ RESULT: ❌ ABORT (E_ORDER_ALREADY_FILLED)                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### The Protection Mechanisms

**1. Order Hash Tracking (Primary)**
```move
// In fill_order:
let order_hash = compute_intent_hash(&intent);

// Check if already filled
assert!(!is_filled(order_hash), E_ORDER_ALREADY_FILLED);

// ... execute swap ...

// Mark as filled BEFORE function returns
mark_filled(order_hash);
```

**2. Nonce Increment (Secondary)**
```move
// Even if hash check somehow failed, nonce provides backup
let current_nonce = get_nonce(alice);
assert!(intent.nonce == current_nonce, E_INVALID_NONCE);

// After successful fill
increment_nonce(alice);  // 0 → 1
```

**3. Escrow Balance Check (Tertiary)**
```move
// Transfer from escrow would fail if funds already taken
let coins = coin::extract(&mut escrow.balance, amount);
// AbortCode: EINSUFFICIENT_BALANCE if escrow empty
```

### Result: First Transaction Wins

```
┌────────────────────────────────────────────────────────────┐
│  FINAL OUTCOME                                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Relayer A:                                                │
│    ✅ Fill succeeded                                       │
│    ✅ Received 100 MOVE                                    │
│    ✅ Paid 84.7875 USDC                                    │
│    ✅ Profit: ~0.21 USDC                                   │
│    ⛽ Gas paid: ~0.005 MOVE                                │
│                                                            │
│  Relayer B:                                                │
│    ❌ Fill reverted                                        │
│    ❌ No MOVE received                                     │
│    ❌ No USDC paid                                         │
│    ❌ Profit: 0                                            │
│    ⛽ Gas WASTED: ~0.003 MOVE (reverted TX still costs!)   │
│                                                            │
│  Alice:                                                    │
│    ✅ Received 84.7875 USDC (exactly once)                 │
│    ✅ 100 MOVE left escrow (exactly once)                  │
│    ✅ Order filled correctly                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Why This is Secure

| Attack Vector | Protection |
|--------------|------------|
| Double-fill same order | `is_filled(hash)` check |
| Replay old order | Nonce mismatch |
| Drain escrow twice | Insufficient balance abort |
| Out-of-order execution | Blockchain serializes TXs |

### Relayer Optimization: Avoid Wasted Gas

Smart relayers can minimize failed TX costs:

```typescript
// Before submitting, simulate the transaction
async function shouldFill(intent: Intent): Promise<boolean> {
  try {
    // Dry-run the transaction
    const simulation = await aptos.transaction.simulate.simple({
      signerPublicKey: relayer.publicKey,
      transaction: buildFillTx(intent),
    });
    
    return simulation[0].success;
  } catch {
    // Contract would revert
    return false;
  }
}
```

**But there's still a race:**
```
Relayer A simulates → success
Relayer B simulates → success
Both submit → Only one wins
```

### Advanced: Private Mempool / Flashbots Style

For high-competition scenarios, relayers might use:

```typescript
// Bundle with MEV protection
const bundle = {
  transactions: [fillTx],
  blockNumber: currentBlock + 1,
  minTimestamp: now,
  maxTimestamp: now + 60,
};

// Submit to private mempool
await submitBundle(bundle, PRIVATE_RPC);
```

This reduces the "failed TX gas waste" problem but adds complexity.

### Practical Impact

For a typical swap system:

| Metric | Value |
|--------|-------|
| Average orders/minute | ~10 |
| Relayers competing | 3-5 |
| Race condition frequency | ~15% of fills |
| Failed TX cost | ~$0.01 per fail |
| Monthly wasted gas (per relayer) | ~$50 |

**Bottom line:** Race conditions are a cost of doing business for relayers, factored into their profit calculations.

---

## Example 7: Malicious Relayer Attempts

### Scenario
Relayer M tries to exploit the system.

### Attack 1: Underpay the User

```typescript
const fillTx = {
  // ... intent params ...
  buy_amount: 50_000000n,  // Trying to pay only 50 USDC instead of 84.7875
};
```

**Result:**
```move
// Contract checks Dutch auction price
let required = calculate_buy_amount(...);  // = 84.7875 USDC
assert!(buy_amount >= required, E_INSUFFICIENT_BUY_AMOUNT);
// 50 < 84.7875 → ❌ ABORT
```

### Attack 2: Fill Expired Order

```typescript
// Order expired at 19:05:00, relayer tries at 19:10:00
const fillTx = { /* expired intent */ };
```

**Result:**
```move
assert!(now <= end_time, E_ORDER_EXPIRED);
// 19:10:00 > 19:05:00 → ❌ ABORT
```

### Attack 3: Forge Signature

```typescript
const fakeSignature = relayer.sign(intentHash);  // Wrong signer!
```

**Result:**
```move
assert!(
  verify_intent_signature(intent, signature, maker),
  E_INVALID_SIGNATURE
);
// Signature doesn't match maker's public key → ❌ ABORT
```

### Attack 4: Drain Multiple Orders with Same Nonce

```typescript
// Try to fill order twice with same nonce
await fillOrder(intent1);  // nonce = 0
await fillOrder(intent2);  // also nonce = 0
```

**Result:**
```move
// First fill: alice.nonce = 0 → 1 ✓
// Second fill: alice.nonce = 1, but intent says 0
assert!(intent.nonce == current_nonce, E_INVALID_NONCE);
// 0 != 1 → ❌ ABORT
```

---

## Summary: What Makes This Work

| Component | Role |
|-----------|------|
| **Off-chain signing** | Users pay $0 gas for swaps |
| **Dutch auction** | Fair price discovery, relayer competition |
| **Escrow** | Holds maker funds, enables atomic swaps |
| **Nonce** | Prevents replay, enables cancellation |
| **Order hash tracking** | Prevents double-fills (race condition safe) |
| **Relayer competition** | Ensures best rates for users |
| **Atomic transactions** | Blockchain guarantees - first TX wins |

---

## Race Condition FAQ

**Q: What if two TXs are in the exact same block position?**
A: Impossible. Blockchain totally orders all transactions within a block.

**Q: Can a relayer front-run another?**
A: Yes, but Movement's fast finality (~2-3s) limits the window. Validators don't reorder by fee (no priority gas auctions).

**Q: Does the user ever lose funds in a race?**
A: No. Either exactly one relayer fills, or none do. Escrow is never double-drained.

**Q: Who pays for failed TXs?**
A: The losing relayer. This is their cost of competition.

---

*Detailed examples for Movement Intent Swap*
