/// Intent Swap Events - Event definitions for the swap system
module intent_swap::events {


    // ==================== Order Events ====================

    #[event]
    /// Emitted when a new order is registered on-chain
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
        nonce: u64,
        timestamp: u64,
    }

    #[event]
    /// Emitted when an order is filled by a resolver
    struct OrderFilled has drop, store {
        order_hash: vector<u8>,
        maker: address,
        resolver: address,
        sell_amount: u64,
        buy_amount: u64,
        timestamp: u64,
    }

    #[event]
    /// Emitted when an order expires without being filled
    struct OrderExpired has drop, store {
        order_hash: vector<u8>,
        maker: address,
        timestamp: u64,
    }

    #[event]
    /// Emitted when a user cancels their order
    struct OrderCancelled has drop, store {
        maker: address,
        old_nonce: u64,
        new_nonce: u64,
        timestamp: u64,
    }

    // ==================== Registry Events ====================

    #[event]
    /// Emitted when the swap registry is initialized
    struct RegistryInitialized has drop, store {
        admin: address,
        timestamp: u64,
    }

    #[event]
    /// Emitted when the registry is paused/unpaused
    struct RegistryPaused has drop, store {
        admin: address,
        paused: bool,
        timestamp: u64,
    }

    // ==================== Emit Functions ====================

    public fun emit_order_created(
        order_hash: vector<u8>,
        maker: address,
        sell_token: vector<u8>,
        buy_token: vector<u8>,
        sell_amount: u64,
        start_buy_amount: u64,
        end_buy_amount: u64,
        start_time: u64,
        end_time: u64,
        nonce: u64,
        timestamp: u64,
    ) {
        0x1::event::emit(OrderCreated {
            order_hash,
            maker,
            sell_token,
            buy_token,
            sell_amount,
            start_buy_amount,
            end_buy_amount,
            start_time,
            end_time,
            nonce,
            timestamp,
        });
    }

    public fun emit_order_filled(
        order_hash: vector<u8>,
        maker: address,
        resolver: address,
        sell_amount: u64,
        buy_amount: u64,
        timestamp: u64,
    ) {
        0x1::event::emit(OrderFilled {
            order_hash,
            maker,
            resolver,
            sell_amount,
            buy_amount,
            timestamp,
        });
    }

    public fun emit_order_expired(
        order_hash: vector<u8>,
        maker: address,
        timestamp: u64,
    ) {
        0x1::event::emit(OrderExpired {
            order_hash,
            maker,
            timestamp,
        });
    }

    public fun emit_order_cancelled(
        maker: address,
        old_nonce: u64,
        new_nonce: u64,
        timestamp: u64,
    ) {
        0x1::event::emit(OrderCancelled {
            maker,
            old_nonce,
            new_nonce,
            timestamp,
        });
    }

    public fun emit_registry_initialized(
        admin: address,
        timestamp: u64,
    ) {
        0x1::event::emit(RegistryInitialized {
            admin,
            timestamp,
        });
    }

    public fun emit_registry_paused(
        admin: address,
        paused: bool,
        timestamp: u64,
    ) {
        0x1::event::emit(RegistryPaused {
            admin,
            paused,
            timestamp,
        });
    }
}
