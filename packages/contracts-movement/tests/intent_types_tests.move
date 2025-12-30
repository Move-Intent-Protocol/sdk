#[test_only]
module intent_protocol::intent_types_tests {
    use intent_protocol::intent_types;
    use std::vector;

    #[test]
    fun test_status_constants() {
        assert!(intent_types::status_pending() == 0, 0);
        assert!(intent_types::status_fulfilled() == 1, 1);
        assert!(intent_types::status_cancelled() == 2, 2);
        assert!(intent_types::status_expired() == 3, 3);
    }

    #[test]
    fun test_intent_creation() {
        let intent = intent_types::new_intent(
            1,  // id
            @0x123,  // requester
            1,  // source_chain_id (Ethereum)
            b"0xToken",  // source_token
            1000000,  // source_amount
            b"0xabcd1234",  // source_tx_hash
            12345,  // source_block_number
            b"0x1::aptos_coin::AptosCoin",  // target_token
            995000,  // target_amount (after fees)
            @0x456,  // assigned_resolver
            1000,  // created_at
            2000,  // expiry_at
            5000,  // fee_amount
            4000,  // resolver_fee
            1000,  // protocol_fee
        );

        assert!(intent_types::get_id(&intent) == 1, 0);
        assert!(intent_types::get_requester(&intent) == @0x123, 1);
        assert!(intent_types::get_source_chain_id(&intent) == 1, 2);
        assert!(intent_types::get_target_amount(&intent) == 995000, 3);
        assert!(intent_types::get_assigned_resolver(&intent) == @0x456, 4);
        assert!(intent_types::get_status(&intent) == 0, 5); // Pending
        assert!(intent_types::is_pending(&intent), 6);
    }

    #[test]
    fun test_status_transitions() {
        let intent = intent_types::new_intent(
            1, @0x123, 1, b"token", 1000, b"hash", 100,
            b"target", 900, @0x456, 1000, 2000, 
            100, 80, 20
        );

        // Should be pending initially
        assert!(intent_types::is_pending(&intent), 0);

        // Fulfill intent
        intent_types::set_intent_fulfilled(&mut intent, @0x456, 1500);
        assert!(intent_types::is_fulfilled(&intent), 1);
        assert!(!intent_types::is_pending(&intent), 2);
    }

    #[test]
    #[expected_failure(abort_code = 3)] // ENOT_PENDING
    fun test_cannot_double_fulfill() {
        let intent = intent_types::new_intent(
            1, @0x123, 1, b"token", 1000, b"hash", 100,
            b"target", 900, @0x456, 1000, 2000,
            100, 80, 20
        );

        intent_types::set_intent_fulfilled(&mut intent, @0x456, 1500);
        // This should fail
        intent_types::set_intent_fulfilled(&mut intent, @0x456, 1600);
    }

    #[test]
    fun test_fee_config() {
        let config = intent_types::new_fee_config(
            30,  // 0.3% base fee
            8000,  // 80% to resolver
            2000,  // 20% to protocol
            100,  // min fee
            10000,  // max fee
        );

        assert!(intent_types::get_base_fee_bps(&config) == 30, 0);
        assert!(intent_types::get_resolver_fee_bps(&config) == 8000, 1);
        assert!(intent_types::get_protocol_fee_bps(&config) == 2000, 2);
        assert!(intent_types::get_min_fee(&config) == 100, 3);
        assert!(intent_types::get_max_fee(&config) == 10000, 4);
    }
}
