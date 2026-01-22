/// Limit Order Module - Fixed-price order execution
/// 
/// Unlike Dutch Auction orders where price decays over time,
/// Limit Orders fill at an exact specified price.
module intent_swap::limit_order {
    use std::signer;
    use std::string;
    use aptos_framework::coin::{Self};
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use aptos_std::smart_table::{Self, SmartTable};
    use aptos_std::type_info;
    use intent_swap::escrow;
    use intent_swap::events;

    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store;
    use aptos_std::string_utils;

    // ==================== Error Codes ====================

    const E_NOT_INITIALIZED: u64 = 600;
    const E_ALREADY_INITIALIZED: u64 = 601;
    const E_UNAUTHORIZED: u64 = 602;
    const E_PAUSED: u64 = 603;
    const E_ORDER_NOT_FOUND: u64 = 604;
    const E_ORDER_ALREADY_FILLED: u64 = 605;
    const E_ORDER_EXPIRED: u64 = 606;
    const E_INVALID_NONCE: u64 = 607;
    const E_INVALID_SIGNATURE: u64 = 608;
    const E_INSUFFICIENT_BUY_AMOUNT: u64 = 609;
    const E_INVALID_INTENT: u64 = 610;
    const E_INSUFFICIENT_ESCROW: u64 = 611;
    const E_TYPE_MISMATCH: u64 = 612;
    const E_VALIDATION_FAILED: u64 = 613;

    // ==================== Structs ====================

    /// Limit order registry (separate from Dutch Auction registry)
    struct LimitOrderRegistry has key {
        /// Admin address
        admin: address,
        /// Filled order hashes (for duplicate prevention)
        filled_orders: SmartTable<vector<u8>, bool>,
        /// User nonces (for replay protection)
        nonces: Table<address, u64>,
        /// Whether registry is paused
        paused: bool,
        /// Total orders filled
        total_filled: u64,
        /// Total volume (in sell token units)
        total_volume: u128,
    }

    /// Limit Intent - Fixed price order (no decay)
    struct LimitIntent has store, drop, copy {
        /// Maker's address (user who wants to swap)
        maker: address,
        /// Unique nonce to prevent replay attacks
        nonce: u64,
        /// Token type to sell (as type info bytes)
        sell_token: vector<u8>,
        /// Token type to buy
        buy_token: vector<u8>,
        /// Amount of sell token
        sell_amount: u64,
        /// FIXED buy amount (exact price, no decay)
        buy_amount: u64,
        /// Unix timestamp when order expires
        expiry_time: u64,
    }

    // ==================== Intent Helpers ====================

    /// Create a new limit intent
    public fun new_limit_intent(
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        buy_amount: u64,
        expiry_time: u64,
    ): LimitIntent {
        LimitIntent {
            maker,
            nonce,
            sell_token,
            buy_token,
            sell_amount,
            buy_amount,
            expiry_time,
        }
    }

    /// Validate limit intent parameters
    public fun validate_limit_intent(intent: &LimitIntent): bool {
        intent.sell_amount > 0 &&
        intent.buy_amount > 0
    }

    // ==================== Intent Getters ====================

    public fun get_maker(intent: &LimitIntent): address { intent.maker }
    public fun get_intent_nonce(intent: &LimitIntent): u64 { intent.nonce }
    public fun get_sell_token(intent: &LimitIntent): vector<u8> { intent.sell_token }
    public fun get_buy_token(intent: &LimitIntent): vector<u8> { intent.buy_token }
    public fun get_sell_amount(intent: &LimitIntent): u64 { intent.sell_amount }
    public fun get_buy_amount(intent: &LimitIntent): u64 { intent.buy_amount }
    public fun get_expiry_time(intent: &LimitIntent): u64 { intent.expiry_time }

    // ==================== Hash Computation ====================

    /// Domain separator for limit order signing
    const LIMIT_ORDER_DOMAIN: vector<u8> = b"MOVE_LIMIT_ORDER_V1";

    /// Compute deterministic hash of limit intent
    public fun compute_limit_intent_hash(intent: &LimitIntent): vector<u8> {
        use std::hash;
        use std::bcs;
        use std::vector;

        let data = vector::empty<u8>();

        // Append domain separator
        vector::append(&mut data, LIMIT_ORDER_DOMAIN);

        // Serialize intent fields in deterministic order
        vector::append(&mut data, bcs::to_bytes(&intent.maker));
        vector::append(&mut data, bcs::to_bytes(&intent.nonce));
        vector::append(&mut data, intent.sell_token);
        vector::append(&mut data, intent.buy_token);
        vector::append(&mut data, bcs::to_bytes(&intent.sell_amount));
        vector::append(&mut data, bcs::to_bytes(&intent.buy_amount));
        vector::append(&mut data, bcs::to_bytes(&intent.expiry_time));

        // SHA3-256 hash
        hash::sha3_256(data)
    }

    // ==================== Signature Verification ====================

    /// Verify signature for limit intent
    public fun verify_limit_signature(
        intent: &LimitIntent,
        signature_bytes: vector<u8>,
        public_key_bytes: vector<u8>,
        signing_nonce: vector<u8>,
    ): bool {
        use std::hash;
        use std::vector;
        use aptos_std::ed25519;
        use aptos_framework::account;

        let maker = intent.maker;

        // Verify signature length (Ed25519 signatures are 64 bytes)
        if (vector::length(&signature_bytes) != 64) {
            return false
        };

        // Verify public key length (Ed25519 public keys are 32 bytes)
        if (vector::length(&public_key_bytes) != 32) {
            return false
        };

        // Get maker's authentication key
        if (!account::exists_at(maker)) {
            return false
        };

        let on_chain_auth_key = account::get_authentication_key(maker);

        // Verify public key matches address (Scheme 0 - Ed25519)
        let expected_auth_key_scheme0 = vector::empty<u8>();
        vector::append(&mut expected_auth_key_scheme0, public_key_bytes);
        vector::push_back(&mut expected_auth_key_scheme0, 0x00);
        let derived_auth_key_scheme0 = hash::sha3_256(expected_auth_key_scheme0);

        // Verify public key matches address (Scheme 2 - SingleKey)
        let expected_auth_key_scheme2 = vector::empty<u8>();
        vector::append(&mut expected_auth_key_scheme2, public_key_bytes);
        vector::push_back(&mut expected_auth_key_scheme2, 0x02);
        let derived_auth_key_scheme2 = hash::sha3_256(expected_auth_key_scheme2);

        if (derived_auth_key_scheme0 != on_chain_auth_key && derived_auth_key_scheme2 != on_chain_auth_key) {
             return false
        };

        // Construct signed message (AIP-62 format)
        let intent_hash = compute_limit_intent_hash(intent);
        let intent_hash_hex = to_hex_string(&intent_hash);

        let full_message = vector::empty<u8>();
        vector::append(&mut full_message, b"APTOS\nmessage: ");
        vector::append(&mut full_message, intent_hash_hex);
        vector::append(&mut full_message, b"\nnonce: ");
        vector::append(&mut full_message, signing_nonce);

        let signature = ed25519::new_signature_from_bytes(signature_bytes);
        let public_key = ed25519::new_unvalidated_public_key_from_bytes(public_key_bytes);

        ed25519::signature_verify_strict(
            &signature,
            &public_key,
            full_message,
        )
    }

    fun to_hex_string(bytes: &vector<u8>): vector<u8> {
        use std::vector;
        let len = vector::length(bytes);
        let hex = vector::empty<u8>();
        let i = 0;
        while (i < len) {
            let b = *vector::borrow(bytes, i);
            let hi = b / 16;
            let lo = b % 16;
            vector::push_back(&mut hex, if (hi < 10) hi + 48 else hi + 87);
            vector::push_back(&mut hex, if (lo < 10) lo + 48 else lo + 87);
            i = i + 1;
        };
        hex
    }

    fun assert_valid_limit_signature(
        intent: &LimitIntent,
        signature_bytes: vector<u8>,
        public_key_bytes: vector<u8>,
        signing_nonce: vector<u8>,
    ) {
        assert!(verify_limit_signature(intent, signature_bytes, public_key_bytes, signing_nonce), E_INVALID_SIGNATURE);
    }

    // ==================== Initialization ====================

    /// Initialize the limit order registry
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<LimitOrderRegistry>(admin_addr), E_ALREADY_INITIALIZED);

        move_to(admin, LimitOrderRegistry {
            admin: admin_addr,
            filled_orders: smart_table::new(),
            nonces: table::new(),
            paused: false,
            total_filled: 0,
            total_volume: 0,
        });

        events::emit_registry_initialized(admin_addr, timestamp::now_seconds());
    }

    // ==================== Order Filling ====================

    /// Fill a limit order - Coin to Coin
    /// 
    /// Unlike Dutch Auction, the buy_amount is FIXED.
    /// Resolver must provide EXACTLY the buy_amount specified.
    public entry fun fill_limit_order<SellCoin, BuyCoin>(
        resolver: &signer,
        registry_addr: address,
        // Intent parameters
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        buy_amount: u64,  // FIXED amount, no decay
        expiry_time: u64,
        // Fill parameters
        fill_buy_amount: u64,  // Amount resolver is providing
        signature: vector<u8>,
        public_key: vector<u8>,
        signing_nonce: vector<u8>,
    ) acquires LimitOrderRegistry {
        let resolver_addr = signer::address_of(resolver);
        assert!(exists<LimitOrderRegistry>(registry_addr), E_NOT_INITIALIZED);

        let registry = borrow_global_mut<LimitOrderRegistry>(registry_addr);
        assert!(!registry.paused, E_PAUSED);

        // Reconstruct intent
        let intent = new_limit_intent(
            maker,
            nonce,
            sell_token,
            buy_token,
            sell_amount,
            buy_amount,
            expiry_time,
        );

        // Validate intent
        assert!(validate_limit_intent(&intent), E_VALIDATION_FAILED);

        // Compute order hash
        let order_hash = compute_limit_intent_hash(&intent);

        // Check not already filled
        assert!(!smart_table::contains(&registry.filled_orders, order_hash), E_ORDER_ALREADY_FILLED);

        // Check nonce
        let current_nonce = get_nonce_internal(&registry.nonces, maker);
        assert!(nonce == current_nonce, E_INVALID_NONCE);

        // Check expiry
        let now = timestamp::now_seconds();
        assert!(now <= expiry_time, E_ORDER_EXPIRED);

        // Verify token types match
        let sell_token_type = type_info::type_name<SellCoin>();
        let buy_token_type = type_info::type_name<BuyCoin>();
        assert!(intent.sell_token == *string::bytes(&sell_token_type), E_TYPE_MISMATCH);
        assert!(intent.buy_token == *string::bytes(&buy_token_type), E_TYPE_MISMATCH);

        // Verify signature
        assert_valid_limit_signature(&intent, signature, public_key, signing_nonce);

        // CRITICAL DIFFERENCE: Fixed price validation
        // Resolver must provide AT LEAST the exact buy_amount
        assert!(fill_buy_amount >= buy_amount, E_INSUFFICIENT_BUY_AMOUNT);

        // Execute the swap:
        // 1. Transfer sell tokens from maker's escrow to resolver
        escrow::transfer_from_escrow<SellCoin>(
            registry_addr,
            registry_addr,
            maker,
            resolver_addr,
            sell_amount,
            order_hash,
        );

        // 2. Transfer buy tokens from resolver to maker (exact amount)
        let buy_coins = coin::withdraw<BuyCoin>(resolver, fill_buy_amount);
        coin::deposit(maker, buy_coins);

        // Update registry state
        smart_table::add(&mut registry.filled_orders, order_hash, true);
        increment_nonce_internal(&mut registry.nonces, maker);
        registry.total_filled = registry.total_filled + 1;
        registry.total_volume = registry.total_volume + (sell_amount as u128);

        // Emit event
        events::emit_order_filled(
            order_hash,
            maker,
            resolver_addr,
            sell_amount,
            fill_buy_amount,
            now,
        );
    }

    /// Fill limit order: FA -> FA
    public entry fun fill_limit_order_fa_to_fa(
        resolver: &signer,
        registry_addr: address,
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        buy_amount: u64,
        expiry_time: u64,
        fill_buy_amount: u64,
        signature: vector<u8>,
        public_key: vector<u8>,
        signing_nonce: vector<u8>,
        sell_asset: Object<Metadata>,
        buy_asset: Object<Metadata>,
    ) acquires LimitOrderRegistry {
        let resolver_addr = signer::address_of(resolver);
        let registry = borrow_global_mut<LimitOrderRegistry>(registry_addr);
        
        let intent = new_limit_intent(maker, nonce, sell_token, buy_token, sell_amount, buy_amount, expiry_time);
        assert!(validate_limit_intent(&intent), E_VALIDATION_FAILED);
        let order_hash = compute_limit_intent_hash(&intent);
        assert!(!smart_table::contains(&registry.filled_orders, order_hash), E_ORDER_ALREADY_FILLED);
        
        let current_nonce = get_nonce_internal(&registry.nonces, maker);
        assert!(nonce == current_nonce, E_INVALID_NONCE);
        
        let now = timestamp::now_seconds();
        assert!(now <= expiry_time, E_ORDER_EXPIRED);

        let sell_addr_str = string_utils::to_string(&object::object_address(&sell_asset));
        let buy_addr_str = string_utils::to_string(&object::object_address(&buy_asset));
        
        assert!(intent.sell_token == *string::bytes(&sell_addr_str), E_TYPE_MISMATCH);
        assert!(intent.buy_token == *string::bytes(&buy_addr_str), E_TYPE_MISMATCH);

        assert_valid_limit_signature(&intent, signature, public_key, signing_nonce);

        // FIXED PRICE: No decay calculation
        assert!(fill_buy_amount >= buy_amount, E_INSUFFICIENT_BUY_AMOUNT);

        escrow::transfer_from_escrow_fa(registry_addr, registry_addr, maker, resolver_addr, sell_amount, sell_asset, order_hash);

        let buy_fa = primary_fungible_store::withdraw(resolver, buy_asset, fill_buy_amount);
        primary_fungible_store::deposit(maker, buy_fa);

        smart_table::add(&mut registry.filled_orders, order_hash, true);
        increment_nonce_internal(&mut registry.nonces, maker);
        registry.total_filled = registry.total_filled + 1;
        registry.total_volume = registry.total_volume + (sell_amount as u128);

        events::emit_order_filled(order_hash, maker, resolver_addr, sell_amount, fill_buy_amount, now);
    }

    /// Fill limit order: Coin -> FA
    public entry fun fill_limit_order_coin_to_fa<SellCoin>(
        resolver: &signer,
        registry_addr: address,
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        buy_amount: u64,
        expiry_time: u64,
        fill_buy_amount: u64,
        signature: vector<u8>,
        public_key: vector<u8>,
        signing_nonce: vector<u8>,
        buy_asset: Object<Metadata>,
    ) acquires LimitOrderRegistry {
        let resolver_addr = signer::address_of(resolver);
        let registry = borrow_global_mut<LimitOrderRegistry>(registry_addr);

        let intent = new_limit_intent(maker, nonce, sell_token, buy_token, sell_amount, buy_amount, expiry_time);
        assert!(validate_limit_intent(&intent), E_VALIDATION_FAILED);
        let order_hash = compute_limit_intent_hash(&intent);
        assert!(!smart_table::contains(&registry.filled_orders, order_hash), E_ORDER_ALREADY_FILLED);
        assert!(nonce == get_nonce_internal(&registry.nonces, maker), E_INVALID_NONCE);
        let now = timestamp::now_seconds();
        assert!(now <= expiry_time, E_ORDER_EXPIRED);

        let sell_token_type = type_info::type_name<SellCoin>();
        let buy_addr_str = string_utils::to_string(&object::object_address(&buy_asset));
        
        assert!(intent.sell_token == *string::bytes(&sell_token_type), E_TYPE_MISMATCH);
        assert!(intent.buy_token == *string::bytes(&buy_addr_str), E_TYPE_MISMATCH);

        assert_valid_limit_signature(&intent, signature, public_key, signing_nonce);

        assert!(fill_buy_amount >= buy_amount, E_INSUFFICIENT_BUY_AMOUNT);

        escrow::transfer_from_escrow<SellCoin>(registry_addr, registry_addr, maker, resolver_addr, sell_amount, order_hash);
        
        let buy_fa = primary_fungible_store::withdraw(resolver, buy_asset, fill_buy_amount);
        primary_fungible_store::deposit(maker, buy_fa);

        smart_table::add(&mut registry.filled_orders, order_hash, true);
        increment_nonce_internal(&mut registry.nonces, maker);
        registry.total_filled = registry.total_filled + 1;
        registry.total_volume = registry.total_volume + (sell_amount as u128);

        events::emit_order_filled(order_hash, maker, resolver_addr, sell_amount, fill_buy_amount, now);
    }

    /// Fill limit order: FA -> Coin
    public entry fun fill_limit_order_fa_to_coin<BuyCoin>(
        resolver: &signer,
        registry_addr: address,
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        buy_amount: u64,
        expiry_time: u64,
        fill_buy_amount: u64,
        signature: vector<u8>,
        public_key: vector<u8>,
        signing_nonce: vector<u8>,
        sell_asset: Object<Metadata>,
    ) acquires LimitOrderRegistry {
        let resolver_addr = signer::address_of(resolver);
        let registry = borrow_global_mut<LimitOrderRegistry>(registry_addr);

        let intent = new_limit_intent(maker, nonce, sell_token, buy_token, sell_amount, buy_amount, expiry_time);
        assert!(validate_limit_intent(&intent), E_VALIDATION_FAILED);
        let order_hash = compute_limit_intent_hash(&intent);
        assert!(!smart_table::contains(&registry.filled_orders, order_hash), E_ORDER_ALREADY_FILLED);
        assert!(nonce == get_nonce_internal(&registry.nonces, maker), E_INVALID_NONCE);
        let now = timestamp::now_seconds();
        assert!(now <= expiry_time, E_ORDER_EXPIRED);

        let sell_addr_str = string_utils::to_string(&object::object_address(&sell_asset));
        let buy_token_type = type_info::type_name<BuyCoin>();
        
        assert!(intent.sell_token == *string::bytes(&sell_addr_str), E_TYPE_MISMATCH);
        assert!(intent.buy_token == *string::bytes(&buy_token_type), E_TYPE_MISMATCH);

        assert_valid_limit_signature(&intent, signature, public_key, signing_nonce);

        assert!(fill_buy_amount >= buy_amount, E_INSUFFICIENT_BUY_AMOUNT);

        escrow::transfer_from_escrow_fa(registry_addr, registry_addr, maker, resolver_addr, sell_amount, sell_asset, order_hash);
        
        let buy_coins = coin::withdraw<BuyCoin>(resolver, fill_buy_amount);
        coin::deposit(maker, buy_coins);

        smart_table::add(&mut registry.filled_orders, order_hash, true);
        increment_nonce_internal(&mut registry.nonces, maker);
        registry.total_filled = registry.total_filled + 1;
        registry.total_volume = registry.total_volume + (sell_amount as u128);

        events::emit_order_filled(order_hash, maker, resolver_addr, sell_amount, fill_buy_amount, now);
    }

    // ==================== Order Cancellation ====================

    /// Cancel all pending limit orders by incrementing nonce
    public entry fun cancel_orders(
        maker: &signer,
        registry_addr: address,
    ) acquires LimitOrderRegistry {
        let maker_addr = signer::address_of(maker);
        assert!(exists<LimitOrderRegistry>(registry_addr), E_NOT_INITIALIZED);

        let registry = borrow_global_mut<LimitOrderRegistry>(registry_addr);

        let old_nonce = get_nonce_internal(&registry.nonces, maker_addr);
        increment_nonce_internal(&mut registry.nonces, maker_addr);
        let new_nonce = old_nonce + 1;

        let now = timestamp::now_seconds();
        events::emit_order_cancelled(maker_addr, old_nonce, new_nonce, now);
    }

    // ==================== Admin Functions ====================

    /// Pause the registry (admin only)
    public entry fun pause(
        admin: &signer,
        registry_addr: address,
    ) acquires LimitOrderRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<LimitOrderRegistry>(registry_addr);
        assert!(registry.admin == admin_addr, E_UNAUTHORIZED);

        registry.paused = true;
        events::emit_registry_paused(admin_addr, true, timestamp::now_seconds());
    }

    /// Unpause the registry (admin only)
    public entry fun unpause(
        admin: &signer,
        registry_addr: address,
    ) acquires LimitOrderRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<LimitOrderRegistry>(registry_addr);
        assert!(registry.admin == admin_addr, E_UNAUTHORIZED);

        registry.paused = false;
        events::emit_registry_paused(admin_addr, false, timestamp::now_seconds());
    }

    // ==================== Internal Functions ====================

    fun get_nonce_internal(nonces: &Table<address, u64>, addr: address): u64 {
        if (table::contains(nonces, addr)) {
            *table::borrow(nonces, addr)
        } else {
            0
        }
    }

    fun increment_nonce_internal(nonces: &mut Table<address, u64>, addr: address) {
        if (table::contains(nonces, addr)) {
            let nonce = table::borrow_mut(nonces, addr);
            *nonce = *nonce + 1;
        } else {
            table::add(nonces, addr, 1);
        }
    }

    // ==================== View Functions ====================

    #[view]
    /// Get user's current nonce
    public fun get_nonce(registry_addr: address, user: address): u64 acquires LimitOrderRegistry {
        let registry = borrow_global<LimitOrderRegistry>(registry_addr);
        get_nonce_internal(&registry.nonces, user)
    }

    #[view]
    /// Check if a limit order hash has been filled
    public fun is_order_filled(registry_addr: address, order_hash: vector<u8>): bool acquires LimitOrderRegistry {
        let registry = borrow_global<LimitOrderRegistry>(registry_addr);
        smart_table::contains(&registry.filled_orders, order_hash)
    }

    #[view]
    /// Check if registry is paused
    public fun is_paused(registry_addr: address): bool acquires LimitOrderRegistry {
        let registry = borrow_global<LimitOrderRegistry>(registry_addr);
        registry.paused
    }

    #[view]
    /// Get total orders filled
    public fun get_total_filled(registry_addr: address): u64 acquires LimitOrderRegistry {
        let registry = borrow_global<LimitOrderRegistry>(registry_addr);
        registry.total_filled
    }

    #[view]
    /// Get total volume
    public fun get_total_volume(registry_addr: address): u128 acquires LimitOrderRegistry {
        let registry = borrow_global<LimitOrderRegistry>(registry_addr);
        registry.total_volume
    }

    #[view]
    /// Get required buy amount for a limit order (always the fixed amount)
    public fun get_required_buy_amount(
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        buy_amount: u64,
        expiry_time: u64,
    ): u64 {
        let intent = new_limit_intent(
            maker, nonce, sell_token, buy_token,
            sell_amount, buy_amount, expiry_time,
        );
        // For limit orders, the required amount is always the fixed buy_amount
        intent.buy_amount
    }
}
