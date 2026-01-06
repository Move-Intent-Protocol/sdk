# Smart Contract Tech Stack

> Move 2.0 development guide for Movement Network Intent Swap contracts.

---

## Tech Stack Overview

| Component | Technology |
|-----------|------------|
| **Language** | Move 2.0 |
| **Network** | Movement Network (Bardock Testnet → Mainnet) |
| **Compiler** | Aptos Move Compiler v2 |
| **Framework** | Aptos Framework (Movement-compatible) |
| **CLI** | Movement CLI / Aptos CLI |
| **Price Oracle** | Pyth Network |

---

## Move 2.0 Language Features

Move 2.0 introduces modern language features we'll use:

### 1. Enum Types

Define different states for orders:

```move
module intent_swap::types {
    /// Order status with enum (Move 2.0)
    public enum OrderStatus has copy, drop, store {
        Open,
        Filled { resolver: address, amount: u64 },
        Expired,
        Cancelled,
    }
    
    /// Intent state machine
    public enum IntentState has copy, drop, store {
        Pending { created_at: u64 },
        Processing { resolver: address },
        Completed { tx_hash: vector<u8> },
        Failed { reason: vector<u8> },
    }
}
```

### 2. Receiver Style Functions

Cleaner, method-like syntax:

```move
module intent_swap::intent {
    use intent_swap::types::Intent;
    
    /// Old style
    public fun get_maker(intent: &Intent): address {
        intent.maker
    }
    
    /// Move 2.0 receiver style
    public fun maker(self: &Intent): address {
        self.maker
    }
    
    /// Called as: intent.maker() instead of get_maker(&intent)
    public fun is_expired(self: &Intent): bool {
        timestamp::now_seconds() > self.end_time
    }
    
    public fun remaining_time(self: &Intent): u64 {
        if (self.is_expired()) {
            0
        } else {
            self.end_time - timestamp::now_seconds()
        }
    }
}
```

### 3. Index Notation

Simplified vector/table access:

```move
module intent_swap::registry {
    use aptos_std::smart_table::{Self, SmartTable};
    
    struct Registry has key {
        orders: SmartTable<vector<u8>, Order>,
    }
    
    public fun get_order(registry: &Registry, hash: vector<u8>): &Order {
        // Move 2.0 index syntax
        &registry.orders[hash]
    }
    
    public fun update_order(registry: &mut Registry, hash: vector<u8>, status: OrderStatus) {
        // Mutable access with index
        registry.orders[hash].status = status;
    }
}
```

### 4. Positional Structs (Wrapper Types)

Type-safe wrappers:

```move
module intent_swap::types {
    /// Wrapper types for type safety
    public struct OrderHash(vector<u8>) has copy, drop, store;
    public struct Nonce(u64) has copy, drop, store;
    public struct Amount(u64) has copy, drop, store;
    
    /// Usage
    public fun new_order_hash(bytes: vector<u8>): OrderHash {
        OrderHash(bytes)
    }
    
    public fun unwrap_hash(hash: OrderHash): vector<u8> {
        let OrderHash(bytes) = hash;
        bytes
    }
}
```

### 5. Package Visibility

Restrict function access to package:

```move
module intent_swap::internal {
    /// Only callable within intent_swap package
    public(package) fun transfer_from_escrow<CoinType>(
        from: address,
        to: address,
        amount: u64,
    ) {
        // Internal transfer logic
    }
}
```

### 6. Enhanced Comparison

Compare any types with `<`, `>`, etc:

```move
module intent_swap::auction {
    /// Compare struct fields directly
    public fun is_better_offer(offer1: &Offer, offer2: &Offer): bool {
        offer1.amount > offer2.amount
    }
}
```

---

## Project Structure

```
intent-swap-contracts/
├── Move.toml                    # Package manifest
├── sources/
│   ├── intent_swap.move         # Main entry module
│   ├── types.move               # Type definitions (enums, structs)
│   ├── registry.move            # Order book state
│   ├── escrow.move              # Token escrow
│   ├── verifier.move            # Signature verification
│   ├── dutch_auction.move       # Price calculation
│   └── events.move              # Event definitions
├── tests/
│   ├── intent_swap_tests.move   # Unit tests
│   ├── escrow_tests.move
│   └── integration_tests.move
└── scripts/
    └── deploy.move              # Deployment scripts
```

---

## Move.toml Configuration

```toml
[package]
name = "IntentSwap"
version = "1.0.0"
authors = ["Intent Protocol Team"]

[addresses]
intent_swap = "_"  # Set during deployment
pyth = "0x7e783b349d3e89cf5931af376ebeadbfab855b3fa239b7ada8f5a92fbea6b387"

[dependencies.AptosFramework]
git = "https://github.com/aptos-labs/aptos-core.git"
rev = "mainnet"
subdir = "aptos-move/framework/aptos-framework"

[dependencies.AptosStdlib]
git = "https://github.com/aptos-labs/aptos-core.git"
rev = "mainnet"
subdir = "aptos-move/framework/aptos-stdlib"

[dependencies.MoveStdlib]
git = "https://github.com/aptos-labs/aptos-core.git"
rev = "mainnet"
subdir = "aptos-move/framework/move-stdlib"

[dependencies.Pyth]
git = "https://github.com/pyth-network/pyth-crosschain.git"
rev = "main"
subdir = "target_chains/aptos/contracts"

[dev-dependencies]

[dev-addresses]
intent_swap = "0x123"
```

---

## Network Configuration

### Bardock Testnet

```yaml
# .movement/config.yaml
profiles:
  default:
    network: custom
    rest_url: "https://aptos.testnet.bardock.movementnetwork.xyz/v1"
    faucet_url: "https://faucet.testnet.bardock.movementnetwork.xyz"
    private_key: "<YOUR_PRIVATE_KEY>"
```

### Network Details

| Network | RPC Endpoint | Chain ID |
|---------|-------------|----------|
| Bardock Testnet | `https://aptos.testnet.bardock.movementnetwork.xyz/v1` | 250 |
| Movement Mainnet | `https://mainnet.movementnetwork.xyz/v1` | 126 |

---

## Deployment Commands

### 1. Initialize Project

```bash
# Install Movement CLI
curl -sSfL https://raw.githubusercontent.com/movementlabsxyz/movement/main/scripts/install.sh | bash

# Initialize account
movement init --network custom --rest-url https://aptos.testnet.bardock.movementnetwork.xyz/v1

# Get testnet tokens
movement account fund-with-faucet --faucet-url https://faucet.testnet.bardock.movementnetwork.xyz
```

### 2. Compile Contracts

```bash
# Compile with Move 2.0 features
movement move compile --move-2

# Run tests
movement move test --move-2

# Check for issues
movement move prove --move-2
```

### 3. Deploy to Testnet

```bash
# Deploy all modules
movement move publish --move-2 --named-addresses intent_swap=default

# Initialize the protocol
movement move run --function-id 'default::intent_swap::initialize'
```

---

## Core Type Definitions

```move
module intent_swap::types {
    use std::string::String;
    
    //=========================================================================
    // ENUMS (Move 2.0)
    //=========================================================================
    
    /// Order status enum
    public enum OrderStatus has copy, drop, store {
        Open,
        Filling,
        Filled { resolver: address, fill_amount: u64, timestamp: u64 },
        Expired { timestamp: u64 },
        Cancelled { timestamp: u64 },
    }
    
    //=========================================================================
    // STRUCTS
    //=========================================================================
    
    /// Intent signed by user
    public struct Intent has copy, drop, store {
        /// Maker's address
        maker: address,
        /// Unique nonce
        nonce: u64,
        /// Token to sell (type info as bytes)
        sell_token: vector<u8>,
        /// Token to buy
        buy_token: vector<u8>,
        /// Amount to sell
        sell_amount: u64,
        /// Dutch auction start amount
        start_buy_amount: u64,
        /// Dutch auction end amount (minimum)
        end_buy_amount: u64,
        /// Auction start time
        start_time: u64,
        /// Auction end time
        end_time: u64,
    }
    
    /// On-chain order record
    public struct Order has store {
        intent: Intent,
        order_hash: vector<u8>,
        status: OrderStatus,
        created_at: u64,
    }
    
    //=========================================================================
    // RECEIVER FUNCTIONS (Move 2.0)
    //=========================================================================
    
    /// Check if intent is expired
    public fun is_expired(self: &Intent): bool {
        timestamp::now_seconds() > self.end_time
    }
    
    /// Check if intent has started
    public fun has_started(self: &Intent): bool {
        timestamp::now_seconds() >= self.start_time
    }
    
    /// Check if intent is active
    public fun is_active(self: &Intent): bool {
        self.has_started() && !self.is_expired()
    }
    
    /// Get remaining time
    public fun remaining_seconds(self: &Intent): u64 {
        if (self.is_expired()) {
            0
        } else {
            self.end_time - timestamp::now_seconds()
        }
    }
}
```

---

## Dutch Auction Implementation

```move
module intent_swap::dutch_auction {
    use aptos_framework::timestamp;
    use intent_swap::types::Intent;
    
    /// Error codes
    const E_NOT_STARTED: u64 = 1;
    const E_EXPIRED: u64 = 2;
    const E_INVALID_BOUNDS: u64 = 3;
    
    /// Calculate current buy amount based on Dutch auction curve
    /// Price starts at start_buy_amount and decreases linearly to end_buy_amount
    public fun calculate_current_price(intent: &Intent): u64 {
        let now = timestamp::now_seconds();
        
        // Validate timing
        assert!(now >= intent.start_time, E_NOT_STARTED);
        assert!(now <= intent.end_time, E_EXPIRED);
        assert!(intent.start_buy_amount >= intent.end_buy_amount, E_INVALID_BOUNDS);
        
        // If we're at or past end time, return minimum
        if (now >= intent.end_time) {
            return intent.end_buy_amount
        };
        
        // Calculate linear interpolation
        let elapsed = now - intent.start_time;
        let duration = intent.end_time - intent.start_time;
        let price_drop = intent.start_buy_amount - intent.end_buy_amount;
        
        // current = start - (drop * elapsed / duration)
        // Use u128 to prevent overflow
        let drop_amount = ((price_drop as u128) * (elapsed as u128) / (duration as u128)) as u64;
        
        intent.start_buy_amount - drop_amount
    }
    
    /// Get auction progress as percentage (0-100)
    public fun get_progress_percent(intent: &Intent): u64 {
        let now = timestamp::now_seconds();
        
        if (now <= intent.start_time) {
            return 0
        };
        if (now >= intent.end_time) {
            return 100
        };
        
        let elapsed = now - intent.start_time;
        let duration = intent.end_time - intent.start_time;
        
        (elapsed * 100) / duration
    }
}
```

---

## Signature Verification

```move
module intent_swap::verifier {
    use std::hash;
    use std::bcs;
    use aptos_std::ed25519;
    use aptos_framework::account;
    use intent_swap::types::Intent;
    
    /// Domain separator for signing
    const DOMAIN_SEPARATOR: vector<u8> = b"MOVE_INTENT_SWAP_V1";
    
    /// Error codes
    const E_INVALID_SIGNATURE: u64 = 1;
    
    /// Compute deterministic hash of intent
    public fun compute_intent_hash(intent: &Intent): vector<u8> {
        let data = vector::empty<u8>();
        
        // Append domain separator
        vector::append(&mut data, DOMAIN_SEPARATOR);
        
        // Serialize intent fields in order
        vector::append(&mut data, bcs::to_bytes(&intent.maker));
        vector::append(&mut data, bcs::to_bytes(&intent.nonce));
        vector::append(&mut data, intent.sell_token);
        vector::append(&mut data, intent.buy_token);
        vector::append(&mut data, bcs::to_bytes(&intent.sell_amount));
        vector::append(&mut data, bcs::to_bytes(&intent.start_buy_amount));
        vector::append(&mut data, bcs::to_bytes(&intent.end_buy_amount));
        vector::append(&mut data, bcs::to_bytes(&intent.start_time));
        vector::append(&mut data, bcs::to_bytes(&intent.end_time));
        
        // SHA3-256 hash
        hash::sha3_256(data)
    }
    
    /// Verify signature matches maker's public key
    public fun verify_signature(
        intent: &Intent,
        signature_bytes: vector<u8>,
    ): bool {
        let message_hash = compute_intent_hash(intent);
        
        // Get maker's authentication key (public key hash)
        let auth_key = account::get_authentication_key(intent.maker);
        
        // Create signature object
        let signature = ed25519::new_signature_from_bytes(signature_bytes);
        let public_key = ed25519::new_unvalidated_public_key_from_bytes(auth_key);
        
        // Verify
        ed25519::signature_verify_strict(
            &signature,
            &public_key,
            message_hash,
        )
    }
    
    #[test]
    fun test_hash_determinism() {
        let intent = Intent {
            maker: @0x1,
            nonce: 0,
            sell_token: b"MOVE",
            buy_token: b"USDC",
            sell_amount: 100,
            start_buy_amount: 85,
            end_buy_amount: 80,
            start_time: 1000,
            end_time: 2000,
        };
        
        let hash1 = compute_intent_hash(&intent);
        let hash2 = compute_intent_hash(&intent);
        
        assert!(hash1 == hash2, 0);
    }
}
```

---

## Pyth Oracle Integration

```move
module intent_swap::oracle {
    use pyth::pyth;
    use pyth::price_identifier;
    use pyth::price::{Self, Price};
    
    /// Price feed IDs
    const MOVE_USD_FEED: vector<u8> = x"...";  // Get from Pyth
    const ETH_USD_FEED: vector<u8> = x"ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace";
    const USDC_USD_FEED: vector<u8> = x"eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a";
    
    /// Error codes
    const E_STALE_PRICE: u64 = 1;
    const E_UNKNOWN_FEED: u64 = 2;
    
    /// Get price with confidence interval
    public fun get_price(feed_id: vector<u8>): (u64, u64, i64) {
        let price_id = price_identifier::from_byte_vec(feed_id);
        let price_obj = pyth::get_price(price_id);
        
        let price_value = price::get_price(&price_obj);
        let conf = price::get_conf(&price_obj);
        let expo = price::get_expo(&price_obj);
        
        // Ensure price is fresh (< 60 seconds old)
        let timestamp = price::get_timestamp(&price_obj);
        let now = aptos_framework::timestamp::now_seconds();
        assert!(now - timestamp < 60, E_STALE_PRICE);
        
        (price_value, conf, expo)
    }
    
    /// Get normalized price (8 decimals)
    public fun get_normalized_price(feed_id: vector<u8>): u64 {
        let (price, _conf, expo) = get_price(feed_id);
        
        // Normalize to 8 decimals
        if (expo < 0) {
            let divisor = pow(10, ((-expo) as u64));
            (price as u64) * 100000000 / divisor
        } else {
            let multiplier = pow(10, (expo as u64));
            (price as u64) * 100000000 * multiplier
        }
    }
}
```

---

## Event Definitions

```move
module intent_swap::events {
    use aptos_framework::event;
    use intent_swap::types::OrderStatus;
    
    #[event]
    /// Emitted when order is created
    struct OrderCreated has drop, store {
        order_hash: vector<u8>,
        maker: address,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        start_buy_amount: u64,
        end_buy_amount: u64,
        start_time: u64,
        end_time: u64,
    }
    
    #[event]
    /// Emitted when order is filled
    struct OrderFilled has drop, store {
        order_hash: vector<u8>,
        maker: address,
        resolver: address,
        sell_amount: u64,
        buy_amount: u64,
        timestamp: u64,
    }
    
    #[event]
    /// Emitted when order expires
    struct OrderExpired has drop, store {
        order_hash: vector<u8>,
        maker: address,
        timestamp: u64,
    }
    
    #[event]
    /// Emitted when order is cancelled
    struct OrderCancelled has drop, store {
        order_hash: vector<u8>,
        maker: address,
        nonce: u64,
        timestamp: u64,
    }
    
    #[event]
    /// Emitted on escrow deposit
    struct EscrowDeposit has drop, store {
        user: address,
        token: vector<u8>,
        amount: u64,
        timestamp: u64,
    }
    
    #[event]
    /// Emitted on escrow withdrawal
    struct EscrowWithdraw has drop, store {
        user: address,
        token: vector<u8>,
        amount: u64,
        timestamp: u64,
    }
}
```

---

## Testing Framework

```move
#[test_only]
module intent_swap::test_helpers {
    use std::signer;
    use aptos_framework::account;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    
    /// Create test account with funds
    public fun create_test_account(framework: &signer, addr: address, amount: u64): signer {
        let account = account::create_account_for_test(addr);
        coin::register<AptosCoin>(&account);
        
        // Mint test coins
        let coins = coin::mint<AptosCoin>(amount, &coin::create_mint_capability<AptosCoin>(framework));
        coin::deposit(addr, coins);
        
        account
    }
    
    /// Fast forward time
    public fun advance_time(seconds: u64) {
        timestamp::fast_forward_seconds(seconds);
    }
    
    /// Create test intent
    public fun create_test_intent(maker: address): Intent {
        Intent {
            maker,
            nonce: 0,
            sell_token: b"0x1::aptos_coin::AptosCoin",
            buy_token: b"0x1::usdc::USDC",
            sell_amount: 100_00000000,  // 100 MOVE
            start_buy_amount: 85_000000, // 85 USDC
            end_buy_amount: 80_000000,   // 80 USDC
            start_time: timestamp::now_seconds(),
            end_time: timestamp::now_seconds() + 300, // 5 minutes
        }
    }
}

#[test]
fun test_dutch_auction_price() {
    use intent_swap::dutch_auction;
    use intent_swap::test_helpers;
    
    // Setup
    let intent = test_helpers::create_test_intent(@0x1);
    
    // At start
    let price = dutch_auction::calculate_current_price(&intent);
    assert!(price == 85_000000, 0);
    
    // At 50%
    test_helpers::advance_time(150);
    let price = dutch_auction::calculate_current_price(&intent);
    assert!(price == 82_500000, 1); // Midpoint
    
    // At end
    test_helpers::advance_time(150);
    let price = dutch_auction::calculate_current_price(&intent);
    assert!(price == 80_000000, 2);
}
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (`movement move test --move-2`)
- [ ] Formal verification (`movement move prove --move-2`)
- [ ] Code review completed
- [ ] Testnet deployment successful
- [ ] Integration tests with frontend

### Deployment Steps

1. [ ] Compile: `movement move compile --move-2`
2. [ ] Deploy: `movement move publish --move-2`
3. [ ] Initialize: Call `initialize()` function
4. [ ] Configure: Set supported tokens, fee parameters
5. [ ] Verify: Check state on explorer

### Post-Deployment

- [ ] Verify contract on explorer
- [ ] Test fill_order with real relayer
- [ ] Monitor events
- [ ] Set up indexer for order book

---

## Resources

- [Move 2.0 Language Spec](https://aptos.dev/en/build/smart-contracts/book/SUMMARY)
- [Movement Network Docs](https://docs.movementlabs.xyz/)
- [Pyth on Movement](https://docs.pyth.network/price-feeds/use-real-time-data/aptos)
- [Aptos Framework Reference](https://aptos.dev/reference/move)

---

*Smart contract tech stack documentation for Movement Intent Swap*
