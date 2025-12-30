#!/bin/bash

ACCOUNT=$(movement account list | grep -B 1 "0x" | head -n 1 | awk '{print $1}' | tr -d '",')

echo "📊 Intent Protocol Status"
echo "========================="
echo ""
echo "Account: $ACCOUNT"
echo "Explorer: https://explorer.movementnetwork.xyz/account/$ACCOUNT?network=testnet"
echo ""

echo "Balance:"
movement account balance --account default
echo ""

echo "Deployed Modules:"
movement account list --query modules --account default 2>/dev/null || echo "No modules deployed yet"
