# Intent Protocol - Movement Contracts

Core Move smart contracts deployed on Movement Network.

## Modules

| Module | Description | Status |
|--------|-------------|--------|
| `intent_types` | Core data structures | ✅ Complete |
| `intent_registry` | Intent lifecycle management | ✅ Complete |
| `liquidity_pool` | LP share-based liquidity | ✅ Complete |
| `resolver_manager` | Resolver network management | ✅ Complete |
| `deposit_manager` | Treasury/escrow management | ✅ Complete |
| `events` | Event emission for indexing | ✅ Complete |

## Setup

```bash
# Build
movement move compile

# Test
movement move test

# Deploy
movement move publish --named-addresses intent_protocol=default
```

## Test Results

✅ **10/10 tests passing (100%)**

See [E2E_TEST_RESULTS_2.md](../../docs/E2E_TEST_RESULTS_2.md) for details.

## Scripts

```bash
# Deploy to testnet
./scripts/deploy.sh

# Initialize protocol
./scripts/init_protocol.sh

# Add supported chain
./scripts/add_chain.sh <chain_id>

# Check status
./scripts/check_status.sh

# Run tests
./scripts/test_protocol.sh
```
