#!/bin/bash
set -e

echo "🚀 Deploying Intent Protocol..."

ACCOUNT=$(movement account list | grep -B 1 "0x" | head -n 1 | awk '{print $1}' | tr -d '",')
echo "Deploying from account: $ACCOUNT"

echo "📦 Compiling..."
movement move compile

echo "📤 Publishing..."
movement move publish \
  --named-addresses intent_protocol=$ACCOUNT \
  --assume-yes

echo "✅ Deployment successful!"
echo "Explorer: https://explorer.movementnetwork.xyz/account/$ACCOUNT?network=testnet"
