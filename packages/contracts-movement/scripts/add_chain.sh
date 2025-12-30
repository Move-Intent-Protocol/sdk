#!/bin/bash

# Add a supported chain to the Intent Protocol
# Usage: ./scripts/add_chain.sh <chain_id>

if [ -z "$1" ]; then
    echo "Usage: $0 <chain_id>"
    echo ""
    echo "Examples:"
    echo "  $0 1           # Ethereum Mainnet"
    echo "  $0 11155111    # Ethereum Sepolia"
    echo "  $0 56          # BSC Mainnet"
    echo "  $0 137         # Polygon Mainnet"
    exit 1
fi

CHAIN_ID=$1
ACCOUNT=$(movement account list | grep -oP '"0x[a-f0-9]+"' | head -n 1 | tr -d '"')

echo "Adding chain ID: $CHAIN_ID"
echo "Registry: $ACCOUNT"
echo ""

movement move run \
  --function-id "${ACCOUNT}::intent_registry::add_supported_chain" \
  --args \
    address:${ACCOUNT} \
    u64:${CHAIN_ID} \
  --assume-yes

echo ""
echo "✅ Chain $CHAIN_ID added successfully!"
