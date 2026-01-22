#[test_only]
module intent_swap::limit_order_tests {
    use std::signer;
    use std::string;
    use aptos_framework::account;
    use aptos_framework::coin::{Self, MintCapability, BurnCapability, FreezeCapability};
    use aptos_framework::timestamp;
    use intent_swap::limit_order;
    use intent_swap::escrow;

    // ==================== Test Coins ====================

    struct USDC {}
    struct MOVE {}

    struct TestCaps<phantom CoinType> has key {
        mint_cap: MintCapability<CoinType>,
        burn_cap: BurnCapability<CoinType>,
        freeze_cap: FreezeCapability<CoinType>,
    }

    // ==================== Setup Helpers ====================

    fun setup_coin<CoinType>(admin: &signer) {
        let name = string::utf8(b"Test Coin");
        let symbol = string::utf8(b"TEST");
        let (burn_cap, freeze_cap, mint_cap) = coin::initialize<CoinType>(
            admin,
            name,
            symbol,
            6, // decimals
            false, // monitor_supply
        );
        move_to(admin, TestCaps { mint_cap, burn_cap, freeze_cap });
    }

    fun mint_to<CoinType>(admin: &signer, to: address, amount: u64) acquires TestCaps {
        let admin_addr = signer::address_of(admin);
        let caps = borrow_global<TestCaps<CoinType>>(admin_addr);
        let coins = coin::mint(amount, &caps.mint_cap);
        if (!coin::is_account_registered<CoinType>(to)) {
            coin::register<CoinType>(&account::create_account_for_test(to));
        };
        coin::deposit(to, coins);
    }

    fun setup_environment(admin: &signer) {
        let framework = account::create_account_for_test(@0x1);
        timestamp::set_time_has_started_for_testing(&framework);
        
        let admin_addr = signer::address_of(admin);

        // Initialize limit order registry
        limit_order::initialize(admin);
        
        // Initialize escrow registry
        escrow::initialize(admin);
        
        // Set swap contract authorized address to admin (where registry is)
        // This allows limit_order to call transfer_from_escrow
        escrow::set_swap_contract(admin, admin_addr, admin_addr);

        // Setup test coins
        setup_coin<USDC>(admin);
        setup_coin<MOVE>(admin);
    }

    // ==================== Limit Intent Tests ====================

    #[test]
    fun test_limit_intent_creation() {
        let intent = limit_order::new_limit_intent(
            @0x1,           // maker
            0,              // nonce
            b"MOVE",        // sell_token
            b"USDC",        // buy_token
            100_000000,     // sell_amount (100 tokens)
            80_000000,      // buy_amount (80 USDC) - FIXED PRICE
            2000,           // expiry_time
        );

        assert!(limit_order::get_maker(&intent) == @0x1, 0);
        assert!(limit_order::get_intent_nonce(&intent) == 0, 1);
        assert!(limit_order::get_sell_amount(&intent) == 100_000000, 2);
        assert!(limit_order::get_buy_amount(&intent) == 80_000000, 3);
        assert!(limit_order::get_expiry_time(&intent) == 2000, 4);
    }

    #[test]
    fun test_limit_intent_validation() {
        // Valid intent
        let valid_intent = limit_order::new_limit_intent(
            @0x1, 0, b"MOVE", b"USDC",
            100, 50, 2000,
        );
        assert!(limit_order::validate_limit_intent(&valid_intent), 0);

        // Invalid: zero sell_amount
        let invalid_intent1 = limit_order::new_limit_intent(
            @0x1, 0, b"MOVE", b"USDC",
            0, 50, 2000,
        );
        assert!(!limit_order::validate_limit_intent(&invalid_intent1), 1);

        // Invalid: zero buy_amount
        let invalid_intent2 = limit_order::new_limit_intent(
            @0x1, 0, b"MOVE", b"USDC",
            100, 0, 2000,
        );
        assert!(!limit_order::validate_limit_intent(&invalid_intent2), 2);
    }

    // ==================== Hash Consistency Tests ====================

    #[test]
    fun test_limit_hash_consistency() {
        let intent = limit_order::new_limit_intent(
            @0x1, 1, b"MOVE", b"USDC",
            100, 50, 2000,
        );

        let hash1 = limit_order::compute_limit_intent_hash(&intent);
        
        // Re-create identical intent
        let intent2 = limit_order::new_limit_intent(
            @0x1, 1, b"MOVE", b"USDC",
            100, 50, 2000,
        );
        let hash2 = limit_order::compute_limit_intent_hash(&intent2);

        assert!(hash1 == hash2, 0);

        // Change one field (nonce)
        let intent3 = limit_order::new_limit_intent(
            @0x1, 2, b"MOVE", b"USDC",
            100, 50, 2000,
        );
        let hash3 = limit_order::compute_limit_intent_hash(&intent3);

        assert!(hash1 != hash3, 1);
    }

    #[test]
    fun test_different_buy_amounts_different_hashes() {
        // Intent with buy_amount = 100
        let intent1 = limit_order::new_limit_intent(
            @0x1, 0, b"MOVE", b"USDC",
            100, 100, 2000,
        );

        // Intent with buy_amount = 80
        let intent2 = limit_order::new_limit_intent(
            @0x1, 0, b"MOVE", b"USDC",
            100, 80, 2000,
        );

        let hash1 = limit_order::compute_limit_intent_hash(&intent1);
        let hash2 = limit_order::compute_limit_intent_hash(&intent2);

        // Different buy amounts = different hashes
        assert!(hash1 != hash2, 0);
    }

    // ==================== Fixed Price Tests ====================

    #[test]
    fun test_required_buy_amount_is_fixed() {
        // The key difference from Dutch Auction:
        // Required buy amount is ALWAYS the fixed buy_amount, regardless of time

        let buy_amount = limit_order::get_required_buy_amount(
            @0x1,           // maker
            0,              // nonce
            b"MOVE",        // sell_token
            b"USDC",        // buy_token
            100_000000,     // sell_amount
            80_000000,      // buy_amount - THIS IS FIXED
            2000,           // expiry_time
        );

        // Should always return the exact buy_amount
        assert!(buy_amount == 80_000000, 0);
    }

    // ==================== Registry Tests ====================

    #[test(admin = @intent_swap)]
    fun test_initialize_registry(admin: &signer) {
        let framework = account::create_account_for_test(@0x1);
        timestamp::set_time_has_started_for_testing(&framework);
        
        limit_order::initialize(admin);
        
        let admin_addr = signer::address_of(admin);
        
        // Verify registry is accessible
        assert!(!limit_order::is_paused(admin_addr), 0);
        assert!(limit_order::get_total_filled(admin_addr) == 0, 1);
        assert!(limit_order::get_total_volume(admin_addr) == 0, 2);
    }

    #[test(admin = @intent_swap, user = @0x123)]
    fun test_nonce_management(admin: &signer, user: &signer) {
        setup_environment(admin);
        
        let admin_addr = signer::address_of(admin);
        let user_addr = signer::address_of(user);
        
        // Create user account
        account::create_account_for_test(user_addr);
        
        // Initial nonce should be 0
        assert!(limit_order::get_nonce(admin_addr, user_addr) == 0, 0);
        
        // Cancel orders increments nonce
        limit_order::cancel_orders(user, admin_addr);
        assert!(limit_order::get_nonce(admin_addr, user_addr) == 1, 1);
        
        // Cancel again
        limit_order::cancel_orders(user, admin_addr);
        assert!(limit_order::get_nonce(admin_addr, user_addr) == 2, 2);
    }

    #[test(admin = @intent_swap)]
    fun test_pause_unpause(admin: &signer) {
        let framework = account::create_account_for_test(@0x1);
        timestamp::set_time_has_started_for_testing(&framework);
        
        limit_order::initialize(admin);
        let admin_addr = signer::address_of(admin);
        
        // Initially not paused
        assert!(!limit_order::is_paused(admin_addr), 0);
        
        // Pause
        limit_order::pause(admin, admin_addr);
        assert!(limit_order::is_paused(admin_addr), 1);
        
        // Unpause
        limit_order::unpause(admin, admin_addr);
        assert!(!limit_order::is_paused(admin_addr), 2);
    }

    // ==================== Escrow Integration Tests ====================

    #[test(admin = @intent_swap, user = @0x123)]
    fun test_escrow_deposit_for_limit_order(admin: &signer, user: &signer) acquires TestCaps {
        setup_environment(admin);
        let user_addr = signer::address_of(user);
        
        mint_to<MOVE>(admin, user_addr, 1000);
        coin::register<MOVE>(user);
        
        // Deposit to escrow
        escrow::deposit<MOVE>(user, 500);
        assert!(escrow::get_balance<MOVE>(user_addr) == 500, 0);
        
        // Deposit more
        escrow::deposit<MOVE>(user, 300);
        assert!(escrow::get_balance<MOVE>(user_addr) == 800, 1);
        
        // User still has 200 in wallet (1000 - 500 - 300)
        assert!(coin::balance<MOVE>(user_addr) == 200, 2);
    }

    // ==================== Comparison with Dutch Auction ====================

    // This test demonstrates the key difference between limit orders and Dutch auction
    #[test]
    fun test_limit_vs_dutch_price_behavior() {
        // Dutch Auction Intent (from types.move)
        use intent_swap::types;
        use intent_swap::dutch_auction;
        
        // Dutch Auction: Price DECAYS from 100 to 50 over time
        let dutch_intent = types::new_intent(
            @0x1, 0, b"MOVE", b"USDC",
            100,    // sell_amount
            100,    // start_buy_amount (HIGH)
            50,     // end_buy_amount (LOW)
            1000,   // start_time
            2000,   // end_time
        );
        
        // At start (t=1000): price = 100
        let dutch_price_start = dutch_auction::calculate_current_price(&dutch_intent, 1000);
        assert!(dutch_price_start == 100, 0);
        
        // At midpoint (t=1500): price = 75 (decayed!)
        let dutch_price_mid = dutch_auction::calculate_current_price(&dutch_intent, 1500);
        assert!(dutch_price_mid == 75, 1);
        
        // At end (t=2000): price = 50
        let dutch_price_end = dutch_auction::calculate_current_price(&dutch_intent, 2000);
        assert!(dutch_price_end == 50, 2);
        
        // Limit Order: Price is FIXED at 80
        let limit_price = limit_order::get_required_buy_amount(
            @0x1, 0, b"MOVE", b"USDC",
            100, 80, 2000,  // buy_amount is 80
        );
        
        // Price is ALWAYS 80, regardless of time
        assert!(limit_price == 80, 3);
        
        // THIS IS THE KEY DIFFERENCE:
        // Dutch Auction: 100 -> 75 -> 50 (decays)
        // Limit Order: 80 -> 80 -> 80 (fixed)
    }
}
