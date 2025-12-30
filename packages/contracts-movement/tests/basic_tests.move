#[test_only]
module intent_protocol::basic_tests {
    use intent_protocol::intent_types;

    #[test]
    fun test_status_constants() {
        assert!(intent_types::status_pending() == 0, 0);
        assert!(intent_types::status_fulfilled() == 1, 1);
    }
}
