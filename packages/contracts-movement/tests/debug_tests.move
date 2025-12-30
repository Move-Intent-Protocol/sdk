#[test_only]
module intent_protocol::debug_tests {
    use std::signer;
    use aptos_framework::account;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::timestamp;
    use intent_protocol::intent_registry;
    use intent_protocol::intent_types;
    use intent_protocol::resolver_manager;
    use intent_protocol::liquidity_pool;
    use intent_protocol::deposit_manager;

    #[test(aptos_framework = @0x1, admin = @0xCAFE, lp = @0xFEED, resolver = @0xBEEF, user = @0xDEAD)]
    fun test_simple_fulfill_amount(
        aptos_framework: &signer,
        admin: &signer,
        lp: &signer,
        resolver: &signer,
        user: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(aptos_framework);
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);
        
        let admin_addr = signer::address_of(admin);
        let lp_addr = signer::address_of(lp);
        let resolver_addr = signer::address_of(resolver);
        let user_addr = signer::address_of(user);

        // Create accounts
        account::create_account_for_test(admin_addr);
        account::create_account_for_test(lp_addr);
        account::create_account_for_test(resolver_addr);
        account::create_account_for_test(user_addr);

        coin::register<AptosCoin>(admin);
        coin::register<AptosCoin>(lp);
        coin::register<AptosCoin>(resolver);
        coin::register<AptosCoin>(user);

        // Mint coins
        coin::deposit(admin_addr, coin::mint(10_000_000_000, &mint_cap));
        coin::deposit(lp_addr, coin::mint(5_000_000_000, &mint_cap));
        coin::deposit(resolver_addr, coin::mint(2_000_000_000, &mint_cap));
        coin::deposit(user_addr, coin::mint(1_000_000_000, &mint_cap));

        // Initialize protocol
        deposit_manager::initialize<AptosCoin>(admin);
        resolver_manager::initialize(admin, 1_000_000_000, 100);
        liquidity_pool::initialize<AptosCoin>(admin);
        intent_registry::initialize(
            admin,
            admin_addr,
            admin_addr,
            30,              // 0.3% base fee
            8000,            // 80% to resolver
            2000,            // 20% to protocol
            100_000,         // min fee
            10_000_000_000,  // max fee
        );
        
        intent_registry::add_supported_chain(admin, admin_addr, 1);
        
        // LP deposits
        liquidity_pool::deposit<AptosCoin>(lp, admin_addr, 3_000_000_000);
        
        // Resolver registers
        resolver_manager::register_resolver<AptosCoin>(resolver, admin_addr, 1_000_000_000);
        
        timestamp::fast_forward_seconds(100);
        
        // Test variables - track everything!
        let source_amount: u64 = 1_000_000_000;  // User locks 1000 tokens on source chain
        let target_amount: u64 = 997_000_000;     // User should receive 997 tokens (3M fee)
        
        // Check user balance BEFORE
        let user_balance_before = coin::balance<AptosCoin>(user_addr);
        
        // Create intent
        intent_registry::create_intent<AptosCoin>(
            user,
            admin_addr,
            1,
            b"0xToken",
            source_amount,
            b"0xhash123",
            12345,
            target_amount,  // This is what user should receive
            3600,
        );
        
        // Get intent to check stored values
        let intent = intent_registry::get_intent(admin_addr, 0);
        let stored_target_amount = intent_types::get_target_amount(&intent);
        
        // Assert the intent was created with correct values
        assert!(stored_target_amount == target_amount, 100);
        
        timestamp::fast_forward_seconds(10);
        
        // Fulfill intent
        intent_registry::fulfill_intent<AptosCoin>(resolver, admin_addr, 0);
        
        // Check user balance AFTER
        let user_balance_after = coin::balance<AptosCoin>(user_addr);
        let amount_received = user_balance_after - user_balance_before;
        
        // Debug: These should match!
        // Expected: user receives target_amount = 997_000_000
        // Actual: amount_received = ?
        
        // Print debug info by using different error codes
        if (amount_received < target_amount) {
            let diff = target_amount - amount_received;
            // User received LESS than expected
            // Error code will be the difference
            assert!(false, diff);
        };
        
        if (amount_received > target_amount) {
            let diff = amount_received - target_amount;
            // User received MORE than expected  
            // Error code will be 1000000000 + difference
            assert!(false, 1_000_000_000 + diff);
        };
        
        // If we got here, amount matches exactly!
        assert!(amount_received == target_amount, 0);
        
        // Cleanup
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }
}
