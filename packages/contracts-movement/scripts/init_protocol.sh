#!/bin/bash
set -e

echo "🔧 Initializing Intent Protocol on Movement Testnet..."
echo ""

# Get account address
ACCOUNT=$(movement account list | grep -oP '"0x[a-f0-9]+"' | head -n 1 | tr -d '"')

if [ -z "$ACCOUNT" ]; then
    echo "❌ Error: No account found. Please set up your Movement account first."
    echo "Run: movement init"
    exit 1
fi

echo "📍 Deployer Account: $ACCOUNT"
echo ""

# Check balance
echo "💰 Checking balance..."
BALANCE=$(movement account balance --account default | grep -oP '\d+' | head -n 1)
echo "Balance: $BALANCE"

if [ "$BALANCE" -lt 10000000 ]; then
    echo "⚠️  Warning: Low balance. You may want to fund your account from the faucet:"
    echo "   https://faucet.testnet.porto.movementlabs.xyz/"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "Step 1/6: Initialize Deposit Manager..."
movement move run \
  --function-id "${ACCOUNT}::deposit_manager::initialize" \
  --type-args "0x1::aptos_coin::AptosCoin" \
  --assume-yes || echo "⚠️  Already initialized or error occurred"

echo ""
echo "Step 2/6: Initialize Resolver Registry..."
movement move run \
  --function-id "${ACCOUNT}::resolver_manager::initialize" \
  --args \
    u64:1000000000 \
    u64:100 \
  --assume-yes || echo "⚠️  Already initialized or error occurred"

echo ""
echo "Step 3/6: Initialize Liquidity Pool..."
movement move run \
  --function-id "${ACCOUNT}::liquidity_pool::initialize" \
  --type-args "0x1::aptos_coin::AptosCoin" \
  --assume-yes || echo "⚠️  Already initialized or error occurred"

echo ""
echo "Step 4/6: Initialize Intent Registry..."
movement move run \
  --function-id "${ACCOUNT}::intent_registry::initialize" \
  --args \
    address:${ACCOUNT} \
    address:${ACCOUNT} \
    u64:30 \
    u64:8000 \
    u64:2000 \
    u64:100000 \
    u64:10000000000 \
  --assume-yes || echo "⚠️  Already initialized or error occurred"

echo ""
echo "Step 5/6: Adding supported chains..."
# Add Ethereum Mainnet
movement move run \
  --function-id "${ACCOUNT}::intent_registry::add_supported_chain" \
  --args \
    address:${ACCOUNT} \
    u64:1 \
  --assume-yes || echo "⚠️  Chain already added or error occurred"

# Add Ethereum Sepolia
movement move run \
  --function-id "${ACCOUNT}::intent_registry::add_supported_chain" \
  --args \
    address:${ACCOUNT} \
    u64:11155111 \
  --assume-yes || echo "⚠️  Chain already added or error occurred"

echo ""
echo "Step 6/6: Registering deployer as first resolver..."
movement move run \
  --function-id "${ACCOUNT}::resolver_manager::register_resolver" \
  --type-args "0x1::aptos_coin::AptosCoin" \
  --args \
    address:${ACCOUNT} \
    u64:1000000000 \
  --assume-yes || echo "⚠️  Already registered or error occurred"

echo ""
echo "✅ Protocol initialization complete!"
echo ""
echo "📊 Protocol Details:"
echo "   Registry Address: $ACCOUNT"
echo "   Supported Chains: 1 (Ethereum), 11155111 (Sepolia)"
echo "   Fee Structure:"
echo "     - Base Fee: 0.3% (30 bps)"
echo "     - Resolver Share: 80%"
echo "     - Protocol Share: 20%"
echo "   Min expiry: 5 minutes"
echo "   Max expiry: 24 hours"
echo ""
echo "🌐 View on Explorer:"
echo "   https://explorer.movementnetwork.xyz/account/$ACCOUNT?network=testnet"
echo ""
