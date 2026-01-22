/// Intent Swap Escrow - Holds user tokens for gasless swaps
/// 
/// Users deposit tokens here to enable gasless swap intents.
/// When a resolver fills an order, tokens are transferred from escrow.
module intent_swap::escrow {
    use std::signer;
    use std::string;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::timestamp;
    use aptos_std::type_info;

    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::account;
    use aptos_std::table::{Self, Table};

    // ==================== Error Codes ====================

    const E_NOT_INITIALIZED: u64 = 200;
    const E_ALREADY_INITIALIZED: u64 = 201;
    const E_INSUFFICIENT_BALANCE: u64 = 202;
    const E_ZERO_AMOUNT: u64 = 203;
    const E_UNAUTHORIZED: u64 = 204;
    const E_PAUSED: u64 = 205;

    friend intent_swap::swap;
    friend intent_swap::limit_order;

    // ==================== Structs ====================

    /// Global escrow registry
    struct EscrowRegistry has key {
        /// Admin address
        admin: address,
        /// Authorized swap contract address (can transfer from escrow)
        swap_contract: address,
        /// Whether escrow is paused
        paused: bool,
    }

    /// User's escrow balance for a specific coin type
    struct UserEscrow<phantom CoinType> has key {
        /// Escrowed coins
        balance: Coin<CoinType>,
        /// Total deposited ever (for tracking)
        total_deposited: u64,
        /// Total withdrawn ever
        total_withdrawn: u64,
    }

    // ==================== FA Structs ====================

    /// Registry for FA support (separate to avoid breaking storage layout)
    struct EscrowFARegistry has key {
        signer_cap: account::SignerCapability,
    }

    /// User's escrow balance for Fungible Assets
    struct UserFAEscrow has key {
        /// Map of FA Metadata Address -> Balance (u64)
        balances: Table<address, u64>,
    }

    /// Stats for FA (Optional/Skipped for simplicity or use events)
    // We track stats in events mostly.

    // ==================== Events ====================

    #[event]
    struct EscrowDeposit has drop, store {
        user: address,
        token_type: vector<u8>,
        amount: u64,
        new_balance: u64,
        timestamp: u64,
    }

    #[event]
    struct EscrowWithdraw has drop, store {
        user: address,
        token_type: vector<u8>,
        amount: u64,
        new_balance: u64,
        timestamp: u64,
    }

    #[event]
    struct EscrowTransfer has drop, store {
        from: address,
        to: address,
        token_type: vector<u8>,
        amount: u64,
        order_hash: vector<u8>,
        timestamp: u64,
    }

    #[event]
    struct EscrowDepositFA has drop, store {
        user: address,
        asset: address,
        amount: u64,
        new_balance: u64,
        timestamp: u64,
    }

    #[event]
    struct EscrowWithdrawFA has drop, store {
        user: address,
        asset: address,
        amount: u64,
        new_balance: u64,
        timestamp: u64,
    }

    #[event]
    struct EscrowTransferFA has drop, store {
        from: address,
        to: address,
        asset: address,
        amount: u64,
        order_hash: vector<u8>,
        timestamp: u64,
    }

    #[event]
    struct EscrowFARegistryInitialized has drop, store {
        resource_account: address,
        timestamp: u64,
    }

    // ==================== Initialization ====================

    /// Initialize the escrow registry
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<EscrowRegistry>(admin_addr), E_ALREADY_INITIALIZED);

        move_to(admin, EscrowRegistry {
            admin: admin_addr,
            swap_contract: @0x0, // Default to 0x0
            paused: false,
        });
    }

    /// Initialize FA Registry (Must be called by admin)
    public entry fun initialize_fa(admin: &signer, seed: vector<u8>) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<EscrowFARegistry>(admin_addr), E_ALREADY_INITIALIZED);

        let (resource_signer, signer_cap) = account::create_resource_account(admin, seed);
        let resource_addr = signer::address_of(&resource_signer);

        move_to(admin, EscrowFARegistry {
            signer_cap,
        });

        0x1::event::emit(EscrowFARegistryInitialized {
            resource_account: resource_addr,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Update swap contract address (admin only)
    public entry fun set_swap_contract(
        admin: &signer,
        registry_addr: address,
        new_swap_contract: address,
    ) acquires EscrowRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<EscrowRegistry>(registry_addr);
        assert!(registry.admin == admin_addr, E_UNAUTHORIZED);
        registry.swap_contract = new_swap_contract;
    }

    // ==================== Coin User Operations ====================

    /// Deposit tokens to escrow
    public entry fun deposit<CoinType>(
        user: &signer,
        amount: u64,
    ) acquires UserEscrow {
        assert!(amount > 0, E_ZERO_AMOUNT);
        
        let user_addr = signer::address_of(user);
        
        // Withdraw coins from user
        let coins = coin::withdraw<CoinType>(user, amount);
        
        // Initialize escrow if needed
        if (!exists<UserEscrow<CoinType>>(user_addr)) {
            move_to(user, UserEscrow<CoinType> {
                balance: coin::zero<CoinType>(),
                total_deposited: 0,
                total_withdrawn: 0,
            });
        };
        
        // Add to escrow
        let escrow = borrow_global_mut<UserEscrow<CoinType>>(user_addr);
        coin::merge(&mut escrow.balance, coins);
        escrow.total_deposited = escrow.total_deposited + amount;
        
        let new_balance = coin::value(&escrow.balance);
        let now = timestamp::now_seconds();
        
        // Emit event
        0x1::event::emit(EscrowDeposit {
            user: user_addr,
            token_type: *string::bytes(&type_info::type_name<CoinType>()),
            amount,
            new_balance,
            timestamp: now,
        });
    }

    /// Withdraw tokens from escrow
    public entry fun withdraw<CoinType>(
        user: &signer,
        amount: u64,
    ) acquires UserEscrow {
        assert!(amount > 0, E_ZERO_AMOUNT);
        
        let user_addr = signer::address_of(user);
        assert!(exists<UserEscrow<CoinType>>(user_addr), E_INSUFFICIENT_BALANCE);
        
        let escrow = borrow_global_mut<UserEscrow<CoinType>>(user_addr);
        assert!(coin::value(&escrow.balance) >= amount, E_INSUFFICIENT_BALANCE);
        
        // Extract and deposit to user
        let coins = coin::extract(&mut escrow.balance, amount);
        coin::deposit(user_addr, coins);
        escrow.total_withdrawn = escrow.total_withdrawn + amount;
        
        let new_balance = coin::value(&escrow.balance);
        let now = timestamp::now_seconds();
        
        // Emit event
        0x1::event::emit(EscrowWithdraw {
            user: user_addr,
            token_type: *string::bytes(&type_info::type_name<CoinType>()),
            amount,
            new_balance,
            timestamp: now,
        });
    }

    /// Withdraw all tokens from escrow
    public entry fun withdraw_all<CoinType>(
        user: &signer,
    ) acquires UserEscrow {
        let user_addr = signer::address_of(user);
        
        if (!exists<UserEscrow<CoinType>>(user_addr)) {
            return
        };
        
        let escrow = borrow_global_mut<UserEscrow<CoinType>>(user_addr);
        let balance = coin::value(&escrow.balance);
        
        if (balance == 0) {
            return
        };
        
        let coins = coin::extract_all(&mut escrow.balance);
        coin::deposit(user_addr, coins);
        escrow.total_withdrawn = escrow.total_withdrawn + balance;
        
        let now = timestamp::now_seconds();
        
        0x1::event::emit(EscrowWithdraw {
            user: user_addr,
            token_type: *string::bytes(&type_info::type_name<CoinType>()),
            amount: balance,
            new_balance: 0,
            timestamp: now,
        });
    }

    // ==================== FA User Operations ====================

    /// Deposit FA to escrow
    public entry fun deposit_fa(
        user: &signer,
        registry_addr: address, // Where EscrowFARegistry is stored (usually admin or contract addr)
        amount: u64,
        asset: Object<Metadata>,
    ) acquires UserFAEscrow, EscrowFARegistry {
        assert!(amount > 0, E_ZERO_AMOUNT);
        let user_addr = signer::address_of(user);
        let asset_addr = object::object_address(&asset);

        // Get resource account address
        // We need the signer cap to know the address? No, we can derive it or store it.
        // Actually, we can just look up the address from the cap? account::get_signer_capability_address(&cap)?
        let registry = borrow_global<EscrowFARegistry>(registry_addr);
        let resource_addr = account::get_signer_capability_address(&registry.signer_cap);

        // Transfer FA from user to resource account
        primary_fungible_store::transfer(user, asset, resource_addr, amount);

        // Initialize user escrow if needed
        if (!exists<UserFAEscrow>(user_addr)) {
            move_to(user, UserFAEscrow {
                balances: table::new(),
            });
        };

        let escrow = borrow_global_mut<UserFAEscrow>(user_addr);
        
        if (!table::contains(&escrow.balances, asset_addr)) {
            table::add(&mut escrow.balances, asset_addr, amount);
        } else {
            let bal = table::borrow_mut(&mut escrow.balances, asset_addr);
            *bal = *bal + amount;
        };

        let final_bal = *table::borrow(&escrow.balances, asset_addr);
        
        0x1::event::emit(EscrowDepositFA {
            user: user_addr,
            asset: asset_addr,
            amount,
            new_balance: final_bal,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Withdraw FA from escrow
    public entry fun withdraw_fa(
        user: &signer,
        registry_addr: address,
        amount: u64,
        asset: Object<Metadata>,
    ) acquires UserFAEscrow, EscrowFARegistry {
        assert!(amount > 0, E_ZERO_AMOUNT);
        let user_addr = signer::address_of(user);
        let asset_addr = object::object_address(&asset);

        assert!(exists<UserFAEscrow>(user_addr), E_INSUFFICIENT_BALANCE);
        let escrow = borrow_global_mut<UserFAEscrow>(user_addr);
        assert!(table::contains(&escrow.balances, asset_addr), E_INSUFFICIENT_BALANCE);

        let bal = table::borrow_mut(&mut escrow.balances, asset_addr);
        assert!(*bal >= amount, E_INSUFFICIENT_BALANCE);
        *bal = *bal - amount;

        // Transfer from resource account to user
        let registry = borrow_global<EscrowFARegistry>(registry_addr);
        let resource_signer = account::create_signer_with_capability(&registry.signer_cap);
        primary_fungible_store::transfer(&resource_signer, asset, user_addr, amount);
        
        let final_bal = *bal;
        
        0x1::event::emit(EscrowWithdrawFA {
            user: user_addr,
            asset: asset_addr,
            amount,
            new_balance: final_bal,
            timestamp: timestamp::now_seconds(),
        });
    }

    // ==================== Internal Transfer (Friend modules only) ====================

    /// Transfer tokens from user escrow to resolver
    public(friend) fun transfer_from_escrow<CoinType>(
        registry_addr: address,
        caller: address,
        from: address,
        to: address,
        amount: u64,
        order_hash: vector<u8>,
    ) acquires EscrowRegistry, UserEscrow {
        let registry = borrow_global<EscrowRegistry>(registry_addr);
        assert!(caller == registry.swap_contract, E_UNAUTHORIZED);
        assert!(!registry.paused, E_PAUSED);
        
        assert!(exists<UserEscrow<CoinType>>(from), E_INSUFFICIENT_BALANCE);
        let escrow = borrow_global_mut<UserEscrow<CoinType>>(from);
        assert!(coin::value(&escrow.balance) >= amount, E_INSUFFICIENT_BALANCE);
        
        let coins = coin::extract(&mut escrow.balance, amount);
        coin::deposit(to, coins);
        
        let now = timestamp::now_seconds();
        
        0x1::event::emit(EscrowTransfer {
            from,
            to,
            token_type: *string::bytes(&type_info::type_name<CoinType>()),
            amount,
            order_hash,
            timestamp: now,
        });
    }

    /// Transfer FA from user escrow to resolver
    public(friend) fun transfer_from_escrow_fa(
        registry_addr: address,
        caller: address,
        from: address,
        to: address,
        amount: u64,
        asset: Object<Metadata>,
        order_hash: vector<u8>,
    ) acquires EscrowRegistry, EscrowFARegistry, UserFAEscrow {
        let registry = borrow_global<EscrowRegistry>(registry_addr);
        assert!(caller == registry.swap_contract, E_UNAUTHORIZED);
        assert!(!registry.paused, E_PAUSED);

        assert!(exists<UserFAEscrow>(from), E_INSUFFICIENT_BALANCE);
        let escrow = borrow_global_mut<UserFAEscrow>(from);
        let asset_addr = object::object_address(&asset);
        assert!(table::contains(&escrow.balances, asset_addr), E_INSUFFICIENT_BALANCE);

        let bal = table::borrow_mut(&mut escrow.balances, asset_addr);
        assert!(*bal >= amount, E_INSUFFICIENT_BALANCE);
        *bal = *bal - amount;

        // Transfer from resource account
        let fa_registry = borrow_global<EscrowFARegistry>(registry_addr);
        let resource_signer = account::create_signer_with_capability(&fa_registry.signer_cap);
        primary_fungible_store::transfer(&resource_signer, asset, to, amount);

        0x1::event::emit(EscrowTransferFA {
            from,
            to,
            asset: asset_addr,
            amount,
            order_hash,
            timestamp: timestamp::now_seconds(),
        });
    }

    // ==================== View Functions ====================

    #[view]
    public fun get_balance<CoinType>(user: address): u64 acquires UserEscrow {
        if (!exists<UserEscrow<CoinType>>(user)) {
            0
        } else {
            let escrow = borrow_global<UserEscrow<CoinType>>(user);
            coin::value(&escrow.balance)
        }
    }

    #[view]
    public fun get_fa_balance(user: address, asset: Object<Metadata>): u64 acquires UserFAEscrow {
        if (!exists<UserFAEscrow>(user)) { return 0 };
        let escrow = borrow_global<UserFAEscrow>(user);
        let asset_addr = object::object_address(&asset);
        if (!table::contains(&escrow.balances, asset_addr)) { return 0 };
        *table::borrow(&escrow.balances, asset_addr)
    }

    #[view]
    public fun get_total_deposited<CoinType>(user: address): u64 acquires UserEscrow {
        if (!exists<UserEscrow<CoinType>>(user)) {
            0
        } else {
            let escrow = borrow_global<UserEscrow<CoinType>>(user);
            escrow.total_deposited
        }
    }

    #[view]
    public fun get_total_withdrawn<CoinType>(user: address): u64 acquires UserEscrow {
        if (!exists<UserEscrow<CoinType>>(user)) {
            0
        } else {
            let escrow = borrow_global<UserEscrow<CoinType>>(user);
            escrow.total_withdrawn
        }
    }

    #[view]
    public fun has_escrow<CoinType>(user: address): bool {
        exists<UserEscrow<CoinType>>(user)
    }
}
