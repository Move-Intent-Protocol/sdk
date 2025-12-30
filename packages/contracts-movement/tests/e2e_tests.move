#[test_only]
module intent_protocol::e2e_tests {
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

    // Test accounts
    const ADMIN: address = @0xCAFE;
    const LP_PROVIDER: address = @0xFEED;
    const RESOLVER: address = @0xBEEF;
    const USER: address = @0xDEAD;

    #[test(aptos_framework = @0x1, admin = @0xCAFE, lp = @0xFEED, resolver = @0xBEEF, user = @0xDEAD)]
    fun test_full_intent_lifecycle(
        aptos_framework: &signer,
        admin: &signer,
        lp: &signer,
        resolver: &signer,
        user: &signer,
    ) {
        // ========================================
        // SETUP: Initialize framework and accounts
        // ========================================
        timestamp::set_time_has_started_for_testing(aptos_framework);
        
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);
        
        // Fund all accounts
        let admin_addr = signer::address_of(admin);
        let lp_addr = signer::address_of(lp);
        let resolver_addr = signer::address_of(resolver);
        let user_addr = signer::address_of(user);

        // Create accounts first
        account::create_account_for_test(admin_addr);
        account::create_account_for_test(lp_addr);
        account::create_account_for_test(resolver_addr);
        account::create_account_for_test(user_addr);

        coin::register<AptosCoin>(admin);
        coin::register<AptosCoin>(lp);
        coin::register<AptosCoin>(resolver);
        coin::register<AptosCoin>(user);

        // Mint coins
        let admin_coins = coin::mint(10_000_000_000, &mint_cap);  // 10,000 MOVE
        let lp_coins = coin::mint(5_000_000_000, &mint_cap);      // 5,000 MOVE
        let resolver_coins = coin::mint(2_000_000_000, &mint_cap); // 2,000 MOVE
        let user_coins = coin::mint(1_000_000_000, &mint_cap);    // 1,000 MOVE

        coin::deposit(admin_addr, admin_coins);
        coin::deposit(lp_addr, lp_coins);
        coin::deposit(resolver_addr, resolver_coins);
        coin::deposit(user_addr, user_coins);

        // ========================================
        // PHASE 1: Initialize all protocol modules
        // ========================================
        
        // 1. Initialize Deposit Manager (Treasury)
        deposit_manager::initialize<AptosCoin>(admin);
        
        // 2. Initialize Resolver Manager
        resolver_manager::initialize(
            admin,
            1_000_000_000,  // min_stake: 1000 MOVE
            100,            // max_resolvers
        );
        
        // 3. Initialize Liquidity Pool
        liquidity_pool::initialize<AptosCoin>(admin);
        
        // 4. Initialize Intent Registry
        intent_registry::initialize(
            admin,
            admin_addr,     // pool_address
            admin_addr,     // resolver_registry
            30,             // base_fee_bps: 0.3%
            8000,           // resolver_fee_bps: 80%
            2000,           // protocol_fee_bps: 20%
            100_000,        // min_fee: 0.1 MOVE
            10_000_000_000, // max_fee: 10,000 MOVE
        );
        
        // 5. Add supported chains (Ethereum)
        intent_registry::add_supported_chain(admin, admin_addr, 1);
        
        // ========================================
        // PHASE 2: Set up liquidity and resolver
        // ========================================
        
        // LP deposits 3000 MOVE into pool
        liquidity_pool::deposit<AptosCoin>(lp, admin_addr, 3_000_000_000);
        
        let lp_shares = liquidity_pool::get_lp_shares<AptosCoin>(admin_addr, lp_addr);
        assert!(lp_shares == 3_000_000_000, 1); // Should get shares equal to first deposit
        
        // Resolver registers with 1000 MOVE stake
        resolver_manager::register_resolver<AptosCoin>(
            resolver,
            admin_addr,
            1_000_000_000
        );
        
        let resolver_count = resolver_manager::get_resolver_count(admin_addr);
        assert!(resolver_count == 1, 2);
        
        // ========================================
        // PHASE 3: Create an intent
        // ========================================
        
        timestamp::fast_forward_seconds(100);
        
        let source_tx_hash = b"0xabcd1234567890";
        
        intent_registry::create_intent<AptosCoin>(
            user,
            admin_addr,
            1,                          // source_chain_id: Ethereum
            b"0xToken",                 // source_token
            1_000_000_000,              // source_amount: 1000 tokens
            source_tx_hash,             // source_tx_hash
            12345678,                   // source_block_number
            997_000_000,                // target_amount: 997 tokens (after fees)
            3600,                       // expiry_time: 1 hour
        );
        
        let next_intent_id = intent_registry::get_next_intent_id(admin_addr);
        assert!(next_intent_id == 1, 3); // First intent created
        
        // Verify intent was created correctly
        let intent_opt = intent_registry::get_intent(admin_addr, 0);
        assert!(intent_types::is_pending(&intent_opt), 4);
        assert!(intent_types::get_requester(&intent_opt) == user_addr, 5);
        assert!(intent_types::get_assigned_resolver(&intent_opt) == resolver_addr, 6);
        
        // ========================================
        // PHASE 4: Fulfill the intent
        // ========================================
        timestamp::fast_forward_seconds(10);
        
        let user_balance_before = coin::balance<AptosCoin>(user_addr);
        
        // Resolver fulfills the intent
        intent_registry::fulfill_intent<AptosCoin>(
            resolver,
            admin_addr,
            0  // intent_id
        );
        
        // Verify intent is fulfilled
        let intent = intent_registry::get_intent(admin_addr, 0);
        assert!(intent_types::is_fulfilled(&intent), 7);
        
        // Verify user received target amount
        let user_balance_after = coin::balance<AptosCoin>(user_addr);
        let amount_received = user_balance_after - user_balance_before;
        assert!(amount_received == 997_000_000, 8);
        
        // ========================================
        // PHASE 5: Test cancellation flow
        // ========================================
        
        timestamp::fast_forward_seconds(100);
        
        // Create another intent
        intent_registry::create_intent<AptosCoin>(
            user,
            admin_addr,
            1,
            b"0xToken2",
            500_000_000,
            b"0xdifferenthash",
            12345679,
            498_500_000,
            3600,
        );
        
        // User cancels their own intent
        intent_registry::cancel_intent(user, admin_addr, 1, b"user cancelled");
        
        let cancelled_intent = intent_registry::get_intent(admin_addr, 1);
        assert!(intent_types::is_cancelled(&cancelled_intent), 9);
        
        // ========================================
        // PHASE 6: Test expiry flow
        // ========================================
        
        // Create another intent
        intent_registry::create_intent<AptosCoin>(
            user,
            admin_addr,
            1,
            b"0xToken3",
            300_000_000,
            b"0xanotherhash",
            12345680,
            299_100_000,
            600,  // 10 minute expiry
        );
        
        // Fast forward past expiry
        timestamp::fast_forward_seconds(700);
        
        // Anyone can mark as expired
        intent_registry::mark_expired(admin_addr, 2);
        
        let expired_intent = intent_registry::get_intent(admin_addr, 2);
        assert!(intent_types::is_expired(&expired_intent), 10);
        
        // ========================================
        // Cleanup
        // ========================================
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @0xCAFE, lp1 = @0xFADE, lp2 = @0xBABE)]
    fun test_liquidity_pool_shares(
        aptos_framework: &signer,
        admin: &signer,
        lp1: &signer,
        lp2: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(aptos_framework);
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);
        
        let admin_addr = signer::address_of(admin);
        let lp1_addr = signer::address_of(lp1);
        let lp2_addr = signer::address_of(lp2);

        // Create accounts
        account::create_account_for_test(admin_addr);
        account::create_account_for_test(lp1_addr);
        account::create_account_for_test(lp2_addr);

        coin::register<AptosCoin>(admin);
        coin::register<AptosCoin>(lp1);
        coin::register<AptosCoin>(lp2);

        coin::deposit(admin_addr, coin::mint(10_000_000_000, &mint_cap));
        coin::deposit(lp1_addr, coin::mint(2_000_000_000, &mint_cap));
        coin::deposit(lp2_addr, coin::mint(1_000_000_000, &mint_cap));

        // Initialize pool
        liquidity_pool::initialize<AptosCoin>(admin);
        
        // LP1 deposits 1000 MOVE (first deposit)
        liquidity_pool::deposit<AptosCoin>(lp1, admin_addr, 1_000_000_000);
        
        let lp1_shares = liquidity_pool::get_lp_shares<AptosCoin>(admin_addr, lp1_addr);
        assert!(lp1_shares == 1_000_000_000, 1); // 1:1 for first deposit
        
        // LP2 deposits 1000 MOVE (should get same shares since value is same)
        liquidity_pool::deposit<AptosCoin>(lp2, admin_addr, 1_000_000_000);
        
        let lp2_shares = liquidity_pool::get_lp_shares<AptosCoin>(admin_addr, lp2_addr);
        assert!(lp2_shares == 1_000_000_000, 2);
        
        let total_liquidity = liquidity_pool::get_total_liquidity<AptosCoin>(admin_addr);
        assert!(total_liquidity == 2_000_000_000, 3);
        
        // LP1 withdraws half their shares
        liquidity_pool::withdraw<AptosCoin>(lp1, admin_addr, 500_000_000);
        
        let lp1_balance = coin::balance<AptosCoin>(lp1_addr);
        assert!(lp1_balance == 1_500_000_000, 4); // 1000 left + 500 withdrawn
        
        // Cleanup
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }

    #[test(aptos_framework = @0x1, admin = @0xCAFE, res1 = @0xACE1, res2 = @0xACE2, res3 = @0xACE3)]
    fun test_round_robin_resolver_assignment(
        aptos_framework: &signer,
        admin: &signer,
        res1: &signer,
        res2: &signer,
        res3: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(aptos_framework);
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);
        
        let admin_addr = signer::address_of(admin);
        let res1_addr = signer::address_of(res1);
        let res2_addr = signer::address_of(res2);
        let res3_addr = signer::address_of(res3);

        // Create accounts
        account::create_account_for_test(admin_addr);
        account::create_account_for_test(res1_addr);
        account::create_account_for_test(res2_addr);
        account::create_account_for_test(res3_addr);

        coin::register<AptosCoin>(admin);
        coin::register<AptosCoin>(res1);
        coin::register<AptosCoin>(res2);
        coin::register<AptosCoin>(res3);

        coin::deposit(admin_addr, coin::mint(10_000_000_000, &mint_cap));
        coin::deposit(res1_addr, coin::mint(2_000_000_000, &mint_cap));
        coin::deposit(res2_addr, coin::mint(2_000_000_000, &mint_cap));
        coin::deposit(res3_addr, coin::mint(2_000_000_000, &mint_cap));

        // Initialize
        resolver_manager::initialize(admin, 1_000_000_000, 100);
        
        // Register 3 resolvers
        resolver_manager::register_resolver<AptosCoin>(res1, admin_addr, 1_000_000_000);
        resolver_manager::register_resolver<AptosCoin>(res2, admin_addr, 1_000_000_000);
        resolver_manager::register_resolver<AptosCoin>(res3, admin_addr, 1_000_000_000);
        
        assert!(resolver_manager::get_resolver_count(admin_addr) == 3, 1);
        
        // Get next resolver 3 times - should cycle through all 3
        let resolver1 = resolver_manager::get_next_resolver(admin_addr);
        let resolver2 = resolver_manager::get_next_resolver(admin_addr);
        let resolver3 = resolver_manager::get_next_resolver(admin_addr);
        let resolver4 = resolver_manager::get_next_resolver(admin_addr); // Should wrap to first
        
        // Verify round-robin (first one assigned should be res1)
        assert!(resolver1 == res1_addr, 2);
        assert!(resolver2 == res2_addr, 3);
        assert!(resolver3 == res3_addr, 4);
        assert!(resolver4 == res1_addr, 5); // Wrapped around
        
        // Cleanup
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
    }
}
