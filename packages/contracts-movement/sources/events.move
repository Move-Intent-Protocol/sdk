/// Event definitions for off-chain indexing and monitoring
module intent_protocol::events {
    use aptos_framework::event;

    #[event]
    /// Emitted when a new intent is created
    struct IntentCreated has drop, store {
        intent_id: u64,
        requester: address,
        source_chain_id: u64,
        source_token: vector<u8>,
        source_amount: u64,
        source_tx_hash: vector<u8>,
        target_amount: u64,
        assigned_resolver: address,
        expiry_at: u64,
        timestamp: u64,
    }

    #[event]
    /// Emitted when an intent is fulfilled
    struct IntentFulfilled has drop, store {
        intent_id: u64,
        requester: address,
        resolver: address,
        amount: u64,
        resolver_fee: u64,
        protocol_fee: u64,
        timestamp: u64,
    }

    #[event]
    /// Emitted when an intent is cancelled
    struct IntentCancelled has drop, store {
        intent_id: u64,
        requester: address,
        cancelled_by: address,
        timestamp: u64,
        reason: vector<u8>,
    }

    #[event]
    /// Emitted when an intent expires
    struct IntentExpired has drop, store {
        intent_id: u64,
        requester: address,
        timestamp: u64,
    }

    #[event]
    /// Emitted when a resolver registers
    struct ResolverRegistered has drop, store {
        resolver: address,
        stake: u64,
        timestamp: u64,
    }

    #[event]
    /// Emitted when a resolver is deregistered
    struct ResolverDeregistered has drop, store {
        resolver: address,
        stake_returned: u64,
        timestamp: u64,
    }

    #[event]
    /// Emitted when a resolver is slashed
    struct ResolverSlashed has drop, store {
        resolver: address,
        amount: u64,
        reason: vector<u8>,
        timestamp: u64,
    }

    #[event]
    /// Emitted when liquidity is deposited
    struct LiquidityDeposited has drop, store {
        provider: address,
        amount: u64,
        shares_minted: u64,
        timestamp: u64,
    }

    #[event]
    /// Emitted when liquidity is withdrawn
    struct LiquidityWithdrawn has drop, store {
        provider: address,
        amount: u64,
        shares_burned: u64,
        timestamp: u64,
    }

    #[event]
    /// Emitted when protocol is paused
    struct EmergencyPause has drop, store {
        admin: address,
        timestamp: u64,
        reason: vector<u8>,
    }

    #[event]
    /// Emitted when protocol is unpaused
    struct EmergencyUnpause has drop, store {
        admin: address,
        timestamp: u64,
    }

    // ==================== Event Emission Functions ====================

    /// Emit intent created event
    public fun emit_intent_created(
        intent_id: u64,
        requester: address,
        source_chain_id: u64,
        source_token: vector<u8>,
        source_amount: u64,
        source_tx_hash: vector<u8>,
        target_amount: u64,
        assigned_resolver: address,
        expiry_at: u64,
        timestamp: u64,
    ) {
        event::emit(IntentCreated {
            intent_id,
            requester,
            source_chain_id,
            source_token,
            source_amount,
            source_tx_hash,
            target_amount,
            assigned_resolver,
            expiry_at,
            timestamp,
        });
    }

    /// Emit intent fulfilled event
    public fun emit_intent_fulfilled(
        intent_id: u64,
        requester: address,
        resolver: address,
        amount: u64,
        resolver_fee: u64,
        protocol_fee: u64,
        timestamp: u64,
    ) {
        event::emit(IntentFulfilled {
            intent_id,
            requester,
            resolver,
            amount,
            resolver_fee,
            protocol_fee,
            timestamp,
        });
    }

    /// Emit intent cancelled event
    public fun emit_intent_cancelled(
        intent_id: u64,
        requester: address,
        cancelled_by: address,
        timestamp: u64,
        reason: vector<u8>,
    ) {
        event::emit(IntentCancelled {
            intent_id,
            requester,
            cancelled_by,
            timestamp,
            reason,
        });
    }

    /// Emit intent expired event
    public fun emit_intent_expired(
        intent_id: u64,
        requester: address,
        timestamp: u64,
    ) {
        event::emit(IntentExpired {
            intent_id,
            requester,
            timestamp,
        });
    }

    /// Emit resolver registered event
    public fun emit_resolver_registered(
        resolver: address,
        stake: u64,
        timestamp: u64,
    ) {
        event::emit(ResolverRegistered {
            resolver,
            stake,
            timestamp,
        });
    }

    /// Emit resolver deregistered event
    public fun emit_resolver_deregistered(
        resolver: address,
        stake_returned: u64,
        timestamp: u64,
    ) {
        event::emit(ResolverDeregistered {
            resolver,
            stake_returned,
            timestamp,
        });
    }

    /// Emit resolver slashed event
    public fun emit_resolver_slashed(
        resolver: address,
        amount: u64,
        reason: vector<u8>,
        timestamp: u64,
    ) {
        event::emit(ResolverSlashed {
            resolver,
            amount,
            reason,
            timestamp,
        });
    }

    /// Emit liquidity deposited event
    public fun emit_liquidity_deposited(
        provider: address,
        amount: u64,
        shares_minted: u64,
        timestamp: u64,
    ) {
        event::emit(LiquidityDeposited {
            provider,
            amount,
            shares_minted,
            timestamp,
        });
    }

    /// Emit liquidity withdrawn event
    public fun emit_liquidity_withdrawn(
        provider: address,
        amount: u64,
        shares_burned: u64,
        timestamp: u64,
    ) {
        event::emit(LiquidityWithdrawn {
            provider,
            amount,
            shares_burned,
            timestamp,
        });
    }

    /// Emit emergency pause event
    public fun emit_emergency_pause(
        admin: address,
        timestamp: u64,
        reason: vector<u8>,
    ) {
        event::emit(EmergencyPause {
            admin,
            timestamp,
            reason,
        });
    }

    /// Emit emergency unpause event
    public fun emit_emergency_unpause(
        admin: address,
        timestamp: u64,
    ) {
        event::emit(EmergencyUnpause {
            admin,
            timestamp,
        });
    }
}