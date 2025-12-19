/// Intent Swap - Main swap execution module
/// 
/// This is the core module that handles:
/// - Order registration
/// - Order filling (by resolvers)
/// - Order cancellation
/// - Nonce management
module intent_swap::swap {
    use std::signer;
    use std::string;
    use aptos_framework::coin::{Self};
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use aptos_std::smart_table::{Self, SmartTable};
    use aptos_std::type_info;
    use intent_swap::types::{Self, AuctionConfig};
    use intent_swap::escrow;
    use intent_swap::dutch_auction;
    use intent_swap::verifier;
    use intent_swap::events;

    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store;
    use aptos_std::string_utils;

    // ==================== Error Codes ====================

    const E_NOT_INITIALIZED: u64 = 500;
    const E_ALREADY_INITIALIZED: u64 = 501;
    const E_UNAUTHORIZED: u64 = 502;
    const E_PAUSED: u64 = 503;
    const E_ORDER_NOT_FOUND: u64 = 504;
    const E_ORDER_ALREADY_FILLED: u64 = 505;
    const E_ORDER_EXPIRED: u64 = 506;
    const E_ORDER_NOT_STARTED: u64 = 507;
    const E_INVALID_NONCE: u64 = 508;
    const E_INVALID_SIGNATURE: u64 = 509;
    const E_INSUFFICIENT_BUY_AMOUNT: u64 = 510;
    const E_INVALID_INTENT: u64 = 511;
    const E_INSUFFICIENT_ESCROW: u64 = 512;
    const E_TYPE_MISMATCH: u64 = 513;
    const E_VALIDATION_FAILED: u64 = 514;

    // ==================== Structs ====================

    /// Main swap registry
    struct SwapRegistry has key {
        /// Admin address
        admin: address,
        /// Filled order hashes (for duplicate prevention)
        filled_orders: SmartTable<vector<u8>, bool>,
        /// User nonces (for replay protection)
        nonces: Table<address, u64>,
        /// Auction configuration
        auction_config: AuctionConfig,
        /// Whether registry is paused
        paused: bool,
        /// Total orders filled
        total_filled: u64,
        /// Total volume (in sell token units)
        total_volume: u128,
    }

    // ==================== Initialization ====================

    /// Initialize the swap registry
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<SwapRegistry>(admin_addr), E_ALREADY_INITIALIZED);

        let now = timestamp::now_seconds();

        move_to(admin, SwapRegistry {
            admin: admin_addr,
            filled_orders: smart_table::new(),
            nonces: table::new(),
            auction_config: types::default_auction_config(),
            paused: false,
            total_filled: 0,
            total_volume: 0,
        });

        events::emit_registry_initialized(admin_addr, now);
    }

    // ==================== Order Filling ====================

    /// Fill an order - main entry point for resolvers
    /// 
    /// SellCoin: The coin type the maker is selling
    /// BuyCoin: The coin type the maker is buying (resolver provides this)
    public entry fun fill_order<SellCoin, BuyCoin>(
        resolver: &signer,
        registry_addr: address,
        // Intent parameters (reconstructed from off-chain data)
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        start_buy_amount: u64,
        end_buy_amount: u64,
        start_time: u64,
        end_time: u64,
        // Fill parameters
        buy_amount: u64,
        signature: vector<u8>,
        public_key: vector<u8>,
    ) acquires SwapRegistry {
        // Legacy: Delegate to V2 using implicit nonce logic
        let nonce_str = verifier::to_string_u64(nonce); 
        fill_order_v2_internal<SellCoin, BuyCoin>(
            resolver, registry_addr, maker, nonce, sell_token, buy_token, 
            sell_amount, start_buy_amount, end_buy_amount, start_time, end_time, 
            buy_amount, signature, public_key, nonce_str
        )
    }

    public entry fun fill_order_v2<SellCoin, BuyCoin>(
        resolver: &signer,
        registry_addr: address,
        // Intent parameters
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        start_buy_amount: u64,
        end_buy_amount: u64,
        start_time: u64,
        end_time: u64,
        // Fill parameters
        buy_amount: u64,
        signature: vector<u8>,
        public_key: vector<u8>,
        signing_nonce: vector<u8>,
    ) acquires SwapRegistry {
        fill_order_v2_internal<SellCoin, BuyCoin>(
            resolver, registry_addr, maker, nonce, sell_token, buy_token, 
            sell_amount, start_buy_amount, end_buy_amount, start_time, end_time, 
            buy_amount, signature, public_key, signing_nonce
        )
    }

    fun fill_order_v2_internal<SellCoin, BuyCoin>(
        resolver: &signer,
        registry_addr: address,
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        start_buy_amount: u64,
        end_buy_amount: u64,
        start_time: u64,
        end_time: u64,
        buy_amount: u64,
        signature: vector<u8>,
        public_key: vector<u8>,
        signing_nonce: vector<u8>,
    ) acquires SwapRegistry {
        let resolver_addr = signer::address_of(resolver);
        assert!(exists<SwapRegistry>(registry_addr), E_NOT_INITIALIZED);

        let registry = borrow_global_mut<SwapRegistry>(registry_addr);
        assert!(!registry.paused, E_PAUSED);

        // Reconstruct intent
        let intent = types::new_intent(
            maker,
            nonce,
            sell_token,
            buy_token,
            sell_amount,
            start_buy_amount,
            end_buy_amount,
            start_time,
            end_time,
        );

        // Validate intent
        assert!(types::validate_intent(&intent), E_VALIDATION_FAILED);

        // Compute order hash
        let order_hash = verifier::compute_intent_hash(&intent);

        // Check not already filled
        assert!(!smart_table::contains(&registry.filled_orders, order_hash), E_ORDER_ALREADY_FILLED);

        // Check nonce
        let current_nonce = get_nonce_internal(&registry.nonces, maker);
        assert!(nonce == current_nonce, E_INVALID_NONCE);

        // Check timing
        let now = timestamp::now_seconds();
        assert!(now >= start_time, E_ORDER_NOT_STARTED);
        assert!(now <= end_time, E_ORDER_EXPIRED);
        
        // SECURITY: Verify that the generic types match the intent fields
        // This prevents signing for one token but executing swap with another
        let sell_token_type = type_info::type_name<SellCoin>();
        let buy_token_type = type_info::type_name<BuyCoin>();
        assert!(types::get_sell_token(&intent) == *string::bytes(&sell_token_type), E_TYPE_MISMATCH);
        assert!(types::get_buy_token(&intent) == *string::bytes(&buy_token_type), E_TYPE_MISMATCH);

        // Verify signature using the V2 logic (explicit nonce)
        verifier::assert_valid_signature_with_nonce(&intent, signature, public_key, signing_nonce);

        // Calculate required buy amount from Dutch auction
        let required_buy_amount = dutch_auction::calculate_current_price(&intent, now);
        assert!(buy_amount >= required_buy_amount, E_INSUFFICIENT_BUY_AMOUNT);

        // Execute the swap:
        // 1. Transfer sell tokens from maker's escrow to resolver
        escrow::transfer_from_escrow<SellCoin>(
            registry_addr,      // registry_addr of escrow (assuming same admin)
            registry_addr,      // caller (swap contract address, which IS the registry address)
            maker,
            resolver_addr,
            sell_amount,
            order_hash,
        );

        // 2. Transfer buy tokens from resolver to maker
        let buy_coins = coin::withdraw<BuyCoin>(resolver, buy_amount);
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
            buy_amount,
            now,
        );
    }

    // ==================== FA Order Filling ====================

    /// Fill order: FA -> FA
    public entry fun fill_order_fa_to_fa(
        resolver: &signer,
        registry_addr: address,
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        start_buy_amount: u64,
        end_buy_amount: u64,
        start_time: u64,
        end_time: u64,
        buy_amount: u64,
        signature: vector<u8>,
        public_key: vector<u8>,
        signing_nonce: vector<u8>,
        sell_asset: Object<Metadata>,
        buy_asset: Object<Metadata>,
    ) acquires SwapRegistry {
        let resolver_addr = signer::address_of(resolver);
        let registry = borrow_global_mut<SwapRegistry>(registry_addr);
        
        let intent = types::new_intent(maker, nonce, sell_token, buy_token, sell_amount, start_buy_amount, end_buy_amount, start_time, end_time);
        assert!(types::validate_intent(&intent), E_VALIDATION_FAILED);
        let order_hash = verifier::compute_intent_hash(&intent);
        assert!(!smart_table::contains(&registry.filled_orders, order_hash), E_ORDER_ALREADY_FILLED);
        
        let current_nonce = get_nonce_internal(&registry.nonces, maker);
        assert!(nonce == current_nonce, E_INVALID_NONCE);
        
        let now = timestamp::now_seconds();
        assert!(now >= start_time, E_ORDER_NOT_STARTED);
        assert!(now <= end_time, E_ORDER_EXPIRED);

        let sell_addr_str = string_utils::to_string(&object::object_address(&sell_asset));
        let buy_addr_str = string_utils::to_string(&object::object_address(&buy_asset));
        
        assert!(types::get_sell_token(&intent) == *string::bytes(&sell_addr_str), E_TYPE_MISMATCH);
        assert!(types::get_buy_token(&intent) == *string::bytes(&buy_addr_str), E_TYPE_MISMATCH);

        verifier::assert_valid_signature_with_nonce(&intent, signature, public_key, signing_nonce);

        let required_buy_amount = dutch_auction::calculate_current_price(&intent, now);
        assert!(buy_amount >= required_buy_amount, E_INSUFFICIENT_BUY_AMOUNT);

        escrow::transfer_from_escrow_fa(registry_addr, registry_addr, maker, resolver_addr, sell_amount, sell_asset, order_hash);

        let buy_fa = primary_fungible_store::withdraw(resolver, buy_asset, buy_amount);
        primary_fungible_store::deposit(maker, buy_fa);

        smart_table::add(&mut registry.filled_orders, order_hash, true);
        increment_nonce_internal(&mut registry.nonces, maker);
        registry.total_filled = registry.total_filled + 1;
        registry.total_volume = registry.total_volume + (sell_amount as u128);

        events::emit_order_filled(order_hash, maker, resolver_addr, sell_amount, buy_amount, now);
    }

    /// Fill order: Coin -> FA
    public entry fun fill_order_coin_to_fa<SellCoin>(
        resolver: &signer,
        registry_addr: address,
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        start_buy_amount: u64,
        end_buy_amount: u64,
        start_time: u64,
        end_time: u64,
        buy_amount: u64,
        signature: vector<u8>,
        public_key: vector<u8>,
        signing_nonce: vector<u8>,
        buy_asset: Object<Metadata>,
    ) acquires SwapRegistry {
        let resolver_addr = signer::address_of(resolver);
        let registry = borrow_global_mut<SwapRegistry>(registry_addr);

        let intent = types::new_intent(maker, nonce, sell_token, buy_token, sell_amount, start_buy_amount, end_buy_amount, start_time, end_time);
        assert!(types::validate_intent(&intent), E_VALIDATION_FAILED);
        let order_hash = verifier::compute_intent_hash(&intent);
        assert!(!smart_table::contains(&registry.filled_orders, order_hash), E_ORDER_ALREADY_FILLED);
        assert!(nonce == get_nonce_internal(&registry.nonces, maker), E_INVALID_NONCE);
        let now = timestamp::now_seconds();
        assert!(now >= start_time, E_ORDER_NOT_STARTED);
        assert!(now <= end_time, E_ORDER_EXPIRED);

        let sell_token_type = type_info::type_name<SellCoin>();
        let buy_addr_str = string_utils::to_string(&object::object_address(&buy_asset));
        
        assert!(types::get_sell_token(&intent) == *string::bytes(&sell_token_type), E_TYPE_MISMATCH);
        assert!(types::get_buy_token(&intent) == *string::bytes(&buy_addr_str), E_TYPE_MISMATCH);

        verifier::assert_valid_signature_with_nonce(&intent, signature, public_key, signing_nonce);

        let required_buy_amount = dutch_auction::calculate_current_price(&intent, now);
        assert!(buy_amount >= required_buy_amount, E_INSUFFICIENT_BUY_AMOUNT);

        escrow::transfer_from_escrow<SellCoin>(registry_addr, registry_addr, maker, resolver_addr, sell_amount, order_hash);
        
        let buy_fa = primary_fungible_store::withdraw(resolver, buy_asset, buy_amount);
        primary_fungible_store::deposit(maker, buy_fa);

        smart_table::add(&mut registry.filled_orders, order_hash, true);
        increment_nonce_internal(&mut registry.nonces, maker);
        registry.total_filled = registry.total_filled + 1;
        registry.total_volume = registry.total_volume + (sell_amount as u128);

        events::emit_order_filled(order_hash, maker, resolver_addr, sell_amount, buy_amount, now);
    }

    /// Fill order: FA -> Coin
    public entry fun fill_order_fa_to_coin<BuyCoin>(
        resolver: &signer,
        registry_addr: address,
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        start_buy_amount: u64,
        end_buy_amount: u64,
        start_time: u64,
        end_time: u64,
        buy_amount: u64,
        signature: vector<u8>,
        public_key: vector<u8>,
        signing_nonce: vector<u8>,
        sell_asset: Object<Metadata>,
    ) acquires SwapRegistry {
        let resolver_addr = signer::address_of(resolver);
        let registry = borrow_global_mut<SwapRegistry>(registry_addr);

        let intent = types::new_intent(maker, nonce, sell_token, buy_token, sell_amount, start_buy_amount, end_buy_amount, start_time, end_time);
        assert!(types::validate_intent(&intent), E_VALIDATION_FAILED);
        let order_hash = verifier::compute_intent_hash(&intent);
        assert!(!smart_table::contains(&registry.filled_orders, order_hash), E_ORDER_ALREADY_FILLED);
        assert!(nonce == get_nonce_internal(&registry.nonces, maker), E_INVALID_NONCE);
        let now = timestamp::now_seconds();
        assert!(now >= start_time, E_ORDER_NOT_STARTED);
        assert!(now <= end_time, E_ORDER_EXPIRED);

        let sell_addr_str = string_utils::to_string(&object::object_address(&sell_asset));
        let buy_token_type = type_info::type_name<BuyCoin>();
        
        assert!(types::get_sell_token(&intent) == *string::bytes(&sell_addr_str), E_TYPE_MISMATCH);
        assert!(types::get_buy_token(&intent) == *string::bytes(&buy_token_type), E_TYPE_MISMATCH);

        verifier::assert_valid_signature_with_nonce(&intent, signature, public_key, signing_nonce);

        let required_buy_amount = dutch_auction::calculate_current_price(&intent, now);
        assert!(buy_amount >= required_buy_amount, E_INSUFFICIENT_BUY_AMOUNT);

        escrow::transfer_from_escrow_fa(registry_addr, registry_addr, maker, resolver_addr, sell_amount, sell_asset, order_hash);
        
        let buy_coins = coin::withdraw<BuyCoin>(resolver, buy_amount);
        coin::deposit(maker, buy_coins);

        smart_table::add(&mut registry.filled_orders, order_hash, true);
        increment_nonce_internal(&mut registry.nonces, maker);
        registry.total_filled = registry.total_filled + 1;
        registry.total_volume = registry.total_volume + (sell_amount as u128);

        events::emit_order_filled(order_hash, maker, resolver_addr, sell_amount, buy_amount, now);
    }

    // ==================== Order Cancellation ====================

    /// Cancel all pending orders by incrementing nonce
    /// 
    /// This invalidates any orders with the old nonce.
    public entry fun cancel_orders(
        maker: &signer,
        registry_addr: address,
    ) acquires SwapRegistry {
        let maker_addr = signer::address_of(maker);
        assert!(exists<SwapRegistry>(registry_addr), E_NOT_INITIALIZED);

        let registry = borrow_global_mut<SwapRegistry>(registry_addr);

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
    ) acquires SwapRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<SwapRegistry>(registry_addr);
        assert!(registry.admin == admin_addr, E_UNAUTHORIZED);

        registry.paused = true;
        events::emit_registry_paused(admin_addr, true, timestamp::now_seconds());
    }

    /// Unpause the registry (admin only)
    public entry fun unpause(
        admin: &signer,
        registry_addr: address,
    ) acquires SwapRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<SwapRegistry>(registry_addr);
        assert!(registry.admin == admin_addr, E_UNAUTHORIZED);

        registry.paused = false;
        events::emit_registry_paused(admin_addr, false, timestamp::now_seconds());
    }

    /// Update auction config (admin only)
    public entry fun update_auction_config(
        admin: &signer,
        registry_addr: address,
        default_duration: u64,
        min_duration: u64,
        max_duration: u64,
        min_price_drop_bps: u64,
        max_price_drop_bps: u64,
    ) acquires SwapRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<SwapRegistry>(registry_addr);
        assert!(registry.admin == admin_addr, E_UNAUTHORIZED);

        registry.auction_config = types::new_auction_config(
            default_duration,
            min_duration,
            max_duration,
            min_price_drop_bps,
            max_price_drop_bps,
        );
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
    public fun get_nonce(registry_addr: address, user: address): u64 acquires SwapRegistry {
        let registry = borrow_global<SwapRegistry>(registry_addr);
        get_nonce_internal(&registry.nonces, user)
    }

    #[view]
    /// Check if an order hash has been filled
    public fun is_order_filled(registry_addr: address, order_hash: vector<u8>): bool acquires SwapRegistry {
        let registry = borrow_global<SwapRegistry>(registry_addr);
        smart_table::contains(&registry.filled_orders, order_hash)
    }

    #[view]
    /// Check if registry is paused
    public fun is_paused(registry_addr: address): bool acquires SwapRegistry {
        let registry = borrow_global<SwapRegistry>(registry_addr);
        registry.paused
    }

    #[view]
    /// Get total orders filled
    public fun get_total_filled(registry_addr: address): u64 acquires SwapRegistry {
        let registry = borrow_global<SwapRegistry>(registry_addr);
        registry.total_filled
    }

    #[view]
    /// Get total volume
    public fun get_total_volume(registry_addr: address): u128 acquires SwapRegistry {
        let registry = borrow_global<SwapRegistry>(registry_addr);
        registry.total_volume
    }

    #[view]
    /// Get auction config
    public fun get_auction_config(registry_addr: address): AuctionConfig acquires SwapRegistry {
        let registry = borrow_global<SwapRegistry>(registry_addr);
        registry.auction_config
    }

    #[view]
    /// Calculate current price for an intent
    public fun calculate_fill_price(
        maker: address,
        nonce: u64,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        start_buy_amount: u64,
        end_buy_amount: u64,
        start_time: u64,
        end_time: u64,
    ): u64 {
        let intent = types::new_intent(
            maker, nonce, sell_token, buy_token,
            sell_amount, start_buy_amount, end_buy_amount,
            start_time, end_time,
        );

        let now = timestamp::now_seconds();
        dutch_auction::calculate_current_price(&intent, now)
    }
    #[view]
    /// Get type name bytes for debugging
    public fun get_type_name_bytes<T>(): vector<u8> {
        *string::bytes(&type_info::type_name<T>())
    }
}
