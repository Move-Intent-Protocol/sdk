// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ECDSA
/// @author OpenZeppelin (simplified version)
/// @notice Library for ECDSA signature verification
library ECDSA {
    error InvalidSignatureLength();
    error InvalidSignatureS();
    error InvalidSignature();

    /// @notice Recover signer address from a signature
    /// @param hash The message hash that was signed
    /// @param signature The signature bytes (65 bytes: r, s, v)
    /// @return signer The recovered signer address
    function recover(bytes32 hash, bytes memory signature) internal pure returns (address signer) {
        if (signature.length != 65) {
            revert InvalidSignatureLength();
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        // EIP-2 compliant: s must be in lower half
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert InvalidSignatureS();
        }

        // Support both pre-EIP-155 (v = 27/28) and post-EIP-155 signatures
        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            revert InvalidSignature();
        }

        signer = ecrecover(hash, v, r, s);
        if (signer == address(0)) {
            revert InvalidSignature();
        }
    }

    /// @notice Recover signer from hash and split signature components
    /// @param hash The message hash
    /// @param v Recovery byte
    /// @param r First 32 bytes of signature
    /// @param s Second 32 bytes of signature
    /// @return signer The recovered address
    function recover(
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure returns (address signer) {
        // EIP-2 compliant: s must be in lower half
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert InvalidSignatureS();
        }

        signer = ecrecover(hash, v, r, s);
        if (signer == address(0)) {
            revert InvalidSignature();
        }
    }

    /// @notice Convert a hash to an eth_sign compatible hash
    /// @param hash The original hash
    /// @return The eth_sign prefixed hash
    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }
}
