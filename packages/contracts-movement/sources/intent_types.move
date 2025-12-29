/// Core data structures and types for the intent-based cross-chain protocol
module intent_protocol::intent_types {
    use std::option::{Self, Option};

    /// Status constants
    const STATUS_PENDING: u8 = 0;
    const STATUS_FULFILLED: u8 = 1;
    const STATUS_CANCELLED: u8 = 2;
    const STATUS_EXPIRED: u8 = 3;

    /// Error codes
    const EINVALID_STATUS_TRANSITION: u64 = 1;
    const EALREADY_FULFILLED: u64 = 2;
    const ENOT_PENDING: u64 = 3;

    /// Main Intent structure representing a cross-chain swap request
    struct Intent has store, drop, copy {
        id: u64,
        requester: address,
        
        // Source chain details
        source_chain_id: u64,
        source_token: vector<u8>,
        source_amount: u64,
        source_tx_hash: vector<u8>,
        source_block_number: u64,
        
        // Target chain details (Movement)
        target_token: vector<u8>,
        target_amount: u64,
        
        // Fulfillment info
        assigned_resolver: address,
        status: u8,
        fulfilled_by: Option<address>,
        
        // Timing
        created_at: u64,
        expiry_at: u64,
        fulfilled_at: Option<u64>,
        
        // Fees
        fee_amount: u64,
        resolver_fee: u64,
        protocol_fee: u64,
    }

    /// Fee configuration for the protocol
    struct FeeConfig has store, drop, copy {
        base_fee_bps: u64,      // Basis points (e.g., 30 = 0.3%)
        resolver_fee_bps: u64,  // % of fee going to resolver (e.g., 8000 = 80%)
        protocol_fee_bps: u64,  // % of fee going to protocol (e.g., 2000 = 20%)
        min_fee: u64,           // Minimum fee in smallest unit
        max_fee: u64,           // Maximum fee in smallest unit
    }

    // ==================== Intent Creation ====================

    /// Create a new intent
    public fun new_intent(
        id: u64,
        requester: address,
        source_chain_id: u64,
        source_token: vector<u8>,
        source_amount: u64,
        source_tx_hash: vector<u8>,
        source_block_number: u64,
        target_token: vector<u8>,
        target_amount: u64,
        assigned_resolver: address,
        created_at: u64,
        expiry_at: u64,
        fee_amount: u64,
        resolver_fee: u64,
        protocol_fee: u64,
    ): Intent {
        Intent {
            id,
            requester,
            source_chain_id,
            source_token,
            source_amount,
            source_tx_hash,
            source_block_number,
            target_token,
            target_amount,
            assigned_resolver,
            status: STATUS_PENDING,
            fulfilled_by: option::none(),
            created_at,
            expiry_at,
            fulfilled_at: option::none(),
            fee_amount,
            resolver_fee,
            protocol_fee,
        }
    }

    /// Create a new fee configuration
    public fun new_fee_config(
        base_fee_bps: u64,
        resolver_fee_bps: u64,
        protocol_fee_bps: u64,
        min_fee: u64,
        max_fee: u64,
    ): FeeConfig {
        FeeConfig {
            base_fee_bps,
            resolver_fee_bps,
            protocol_fee_bps,
            min_fee,
            max_fee,
        }
    }

    // ==================== Status Queries ====================

    /// Get status constants
    public fun status_pending(): u8 { STATUS_PENDING }
    public fun status_fulfilled(): u8 { STATUS_FULFILLED }
    public fun status_cancelled(): u8 { STATUS_CANCELLED }
    public fun status_expired(): u8 { STATUS_EXPIRED }

    /// Check if intent is pending
    public fun is_pending(intent: &Intent): bool {
        intent.status == STATUS_PENDING
    }

    /// Check if intent is fulfilled
    public fun is_fulfilled(intent: &Intent): bool {
        intent.status == STATUS_FULFILLED
    }

    /// Check if intent is cancelled
    public fun is_cancelled(intent: &Intent): bool {
        intent.status == STATUS_CANCELLED
    }

    /// Check if intent is expired
    public fun is_expired(intent: &Intent): bool {
        intent.status == STATUS_EXPIRED
    }

    // ==================== Status Transitions ====================

    /// Mark intent as fulfilled
    public fun set_intent_fulfilled(
        intent: &mut Intent,
        resolver: address,
        timestamp: u64
    ) {
        assert!(intent.status == STATUS_PENDING, ENOT_PENDING);
        intent.status = STATUS_FULFILLED;
        intent.fulfilled_by = option::some(resolver);
        intent.fulfilled_at = option::some(timestamp);
    }

    /// Mark intent as cancelled
    public fun set_intent_cancelled(intent: &mut Intent) {
        assert!(intent.status == STATUS_PENDING, ENOT_PENDING);
        intent.status = STATUS_CANCELLED;
    }

    /// Mark intent as expired
    public fun set_intent_expired(intent: &mut Intent) {
        assert!(intent.status == STATUS_PENDING, ENOT_PENDING);
        intent.status = STATUS_EXPIRED;
    }

    // ==================== Getters ====================

    public fun get_id(intent: &Intent): u64 { intent.id }
    public fun get_requester(intent: &Intent): address { intent.requester }
    public fun get_source_chain_id(intent: &Intent): u64 { intent.source_chain_id }
    public fun get_source_token(intent: &Intent): vector<u8> { intent.source_token }
    public fun get_source_amount(intent: &Intent): u64 { intent.source_amount }
    public fun get_source_tx_hash(intent: &Intent): vector<u8> { intent.source_tx_hash }
    public fun get_source_block_number(intent: &Intent): u64 { intent.source_block_number }
    public fun get_target_token(intent: &Intent): vector<u8> { intent.target_token }
    public fun get_target_amount(intent: &Intent): u64 { intent.target_amount }
    public fun get_assigned_resolver(intent: &Intent): address { intent.assigned_resolver }
    public fun get_status(intent: &Intent): u8 { intent.status }
    public fun get_created_at(intent: &Intent): u64 { intent.created_at }
    public fun get_expiry(intent: &Intent): u64 { intent.expiry_at }
    public fun get_fee_amount(intent: &Intent): u64 { intent.fee_amount }
    public fun get_resolver_fee(intent: &Intent): u64 { intent.resolver_fee }
    public fun get_protocol_fee(intent: &Intent): u64 { intent.protocol_fee }

    // FeeConfig getters
    public fun get_base_fee_bps(config: &FeeConfig): u64 { config.base_fee_bps }
    public fun get_resolver_fee_bps(config: &FeeConfig): u64 { config.resolver_fee_bps }
    public fun get_protocol_fee_bps(config: &FeeConfig): u64 { config.protocol_fee_bps }
    public fun get_min_fee(config: &FeeConfig): u64 { config.min_fee }
    public fun get_max_fee(config: &FeeConfig): u64 { config.max_fee }
}