/// Dutch Auction - Price calculation for intent swaps
/// 
/// Implements a linear Dutch auction where price starts high and decreases
/// linearly over time until the end time.
module intent_swap::dutch_auction {
    use intent_swap::types::{Self, SwapIntent};

    // ==================== Error Codes ====================

    const E_NOT_STARTED: u64 = 300;
    const E_EXPIRED: u64 = 301;
    const E_INVALID_BOUNDS: u64 = 302;
    const E_INSUFFICIENT_AMOUNT: u64 = 303;

    // ==================== Price Calculation ====================

    /// Calculate current buy amount based on Dutch auction curve
    /// 
    /// Price starts at start_buy_amount and decreases linearly to end_buy_amount
    /// 
    /// Formula: current = start - (start - end) * elapsed / duration
    public fun calculate_current_price(
        intent: &SwapIntent,
        current_time: u64,
    ): u64 {
        let start_time = types::get_start_time(intent);
        let end_time = types::get_end_time(intent);
        let start_buy = types::get_start_buy_amount(intent);
        let end_buy = types::get_end_buy_amount(intent);

        // Validate timing
        assert!(current_time >= start_time, E_NOT_STARTED);
        assert!(current_time >= start_time, E_NOT_STARTED);
        // assert!(current_time <= end_time, E_EXPIRED); // Removed to allow querying price after end (returns min)
        assert!(start_buy >= end_buy, E_INVALID_BOUNDS);

        // If we're at or past end time, return minimum
        if (current_time >= end_time) {
            return end_buy
        };

        // Calculate linear interpolation
        let elapsed = current_time - start_time;
        let duration = end_time - start_time;
        let price_drop = start_buy - end_buy;

        // current = start - (drop * elapsed / duration)
        // Use u128 to prevent overflow
        let drop_amount = ((price_drop as u128) * (elapsed as u128) / (duration as u128)) as u64;

        start_buy - drop_amount
    }

    /// Get auction progress as percentage (0-100)
    public fun get_progress_percent(
        intent: &SwapIntent,
        current_time: u64,
    ): u64 {
        let start_time = types::get_start_time(intent);
        let end_time = types::get_end_time(intent);

        if (current_time <= start_time) {
            return 0
        };
        if (current_time >= end_time) {
            return 100
        };

        let elapsed = current_time - start_time;
        let duration = end_time - start_time;

        (elapsed * 100) / duration
    }

    /// Calculate the price drop percentage at current time (in basis points)
    public fun get_price_drop_bps(
        intent: &SwapIntent,
        current_time: u64,
    ): u64 {
        let start_buy = types::get_start_buy_amount(intent);
        let current_price = calculate_current_price(intent, current_time);
        
        if (current_price >= start_buy) {
            return 0
        };

        let drop = start_buy - current_price;
        (drop * 10000) / start_buy
    }

    /// Validate that a fill amount meets the current auction requirements
    public fun validate_fill_amount(
        intent: &SwapIntent,
        fill_amount: u64,
        current_time: u64,
    ): bool {
        let required = calculate_current_price(intent, current_time);
        fill_amount >= required
    }

    /// Assert that fill amount is sufficient (reverts if not)
    public fun assert_fill_amount_sufficient(
        intent: &SwapIntent,
        fill_amount: u64,
        current_time: u64,
    ) {
        let required = calculate_current_price(intent, current_time);
        assert!(fill_amount >= required, E_INSUFFICIENT_AMOUNT);
    }

    // ==================== Utility Functions ====================

    /// Get the maximum savings a resolver can get (price at end - price at start)
    public fun get_max_resolver_savings(intent: &SwapIntent): u64 {
        let start_buy = types::get_start_buy_amount(intent);
        let end_buy = types::get_end_buy_amount(intent);
        start_buy - end_buy
    }

    /// Get resolver savings at current time
    public fun get_current_resolver_savings(
        intent: &SwapIntent,
        current_time: u64,
    ): u64 {
        let start_buy = types::get_start_buy_amount(intent);
        let current_price = calculate_current_price(intent, current_time);
        start_buy - current_price
    }

    /// Calculate what the price will be at a given time
    public fun price_at_time(
        intent: &SwapIntent,
        target_time: u64,
    ): u64 {
        let start_time = types::get_start_time(intent);
        let end_time = types::get_end_time(intent);
        let start_buy = types::get_start_buy_amount(intent);
        let end_buy = types::get_end_buy_amount(intent);

        if (target_time <= start_time) {
            return start_buy
        };
        if (target_time >= end_time) {
            return end_buy
        };

        let elapsed = target_time - start_time;
        let duration = end_time - start_time;
        let price_drop = start_buy - end_buy;

        let drop_amount = ((price_drop as u128) * (elapsed as u128) / (duration as u128)) as u64;
        start_buy - drop_amount
    }

    // ==================== Tests ====================

    #[test]
    fun test_price_at_start() {
        let intent = types::new_intent(
            @0x1,           // maker
            0,              // nonce
            b"MOVE",        // sell_token
            b"USDC",        // buy_token
            100_00000000,   // sell_amount (100 tokens)
            85_000000,      // start_buy_amount (85 USDC)
            80_000000,      // end_buy_amount (80 USDC)
            1000,           // start_time
            1300,           // end_time (5 minutes later)
        );

        // At start, price should be start_buy_amount
        let price = calculate_current_price(&intent, 1000);
        assert!(price == 85_000000, 0);
    }

    #[test]
    fun test_price_at_midpoint() {
        let intent = types::new_intent(
            @0x1, 0, b"MOVE", b"USDC",
            100_00000000,
            85_000000,
            80_000000,
            1000,
            1300,
        );

        // At midpoint (1150), price should be halfway
        let price = calculate_current_price(&intent, 1150);
        // Expected: 85 - (85-80) * 150/300 = 85 - 2.5 = 82.5
        assert!(price == 82_500000, 1);
    }

    #[test]
    fun test_price_at_end() {
        let intent = types::new_intent(
            @0x1, 0, b"MOVE", b"USDC",
            100_00000000,
            85_000000,
            80_000000,
            1000,
            1300,
        );

        // At end, price should be end_buy_amount
        let price = calculate_current_price(&intent, 1300);
        assert!(price == 80_000000, 2);
    }

    #[test]
    fun test_progress_percent() {
        let intent = types::new_intent(
            @0x1, 0, b"MOVE", b"USDC",
            100_00000000,
            85_000000,
            80_000000,
            1000,
            1300,
        );

        assert!(get_progress_percent(&intent, 1000) == 0, 0);
        assert!(get_progress_percent(&intent, 1150) == 50, 1);
        assert!(get_progress_percent(&intent, 1300) == 100, 2);
    }
}
