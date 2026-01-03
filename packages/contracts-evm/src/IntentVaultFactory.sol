// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {IDepositVault} from "./interfaces/IDepositVault.sol";
import {DepositVault} from "./DepositVault.sol";
import {Clones} from "./libraries/Clones.sol";
import {ECDSA} from "./libraries/ECDSA.sol";

/// @title IntentVaultFactory
/// @author Intent Protocol Team
/// @notice Factory contract that creates isolated deposit vaults per intent using CREATE2
/// @dev Uses EIP-1167 minimal proxies for gas-efficient vault deployment
contract IntentVaultFactory {
    using Clones for address;
    using ECDSA for bytes32;

    // ============ Constants ============

    /// @notice EIP-712 domain separator components
    bytes32 public constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    bytes32 public constant RELEASE_TYPEHASH = keccak256(
        "Release(bytes32 intentId,address token,address recipient,uint256 nonce)"
    );

    string public constant NAME = "IntentVaultFactory";
    string public constant VERSION = "1";

    // ============ State Variables ============

    /// @notice Implementation contract for vault clones
    address public immutable vaultImplementation;

    /// @notice EIP-712 domain separator (computed once at deployment)
    bytes32 public immutable DOMAIN_SEPARATOR;

    /// @notice Contract owner (admin)
    address public owner;

    /// @notice Required number of relayer signatures
    uint256 public signatureThreshold;

    /// @notice Total number of registered relayers
    uint256 public relayerCount;

    /// @notice Contract paused state
    bool public paused;

    /// @notice Mapping of authorized relayer addresses
    mapping(address => bool) public authorizedRelayers;

    /// @notice Mapping of intent ID to vault address
    mapping(bytes32 => address) public intentToVault;

    /// @notice Nonce per intent to prevent replay attacks
    mapping(bytes32 => uint256) public intentNonces;

    /// @notice Mapping of supported target chain IDs
    mapping(uint256 => bool) public supportedChains;

    /// @notice Total number of vaults created
    uint256 public totalVaults;

    // ============ Events ============

    event VaultCreated(
        bytes32 indexed intentId,
        address indexed vault,
        address indexed user,
        uint256 targetChainId,
        uint256 timestamp
    );

    event FundsReleased(
        bytes32 indexed intentId,
        address indexed vault,
        address indexed recipient,
        address token,
        uint256 amount,
        uint256 nonce
    );

    event FundsRefunded(
        bytes32 indexed intentId,
        address indexed vault,
        address indexed user,
        address token,
        uint256 amount
    );

    event RelayerAdded(address indexed relayer, uint256 newRelayerCount);
    event RelayerRemoved(address indexed relayer, uint256 newRelayerCount);
    event ThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event ChainAdded(uint256 indexed chainId);
    event ChainRemoved(uint256 indexed chainId);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ============ Errors ============

    error NotOwner();
    error NotAuthorizedRelayer();
    error InvalidProof();
    error VaultNotFound();
    error ZeroAddress();
    error ContractPaused();
    error InvalidThreshold();
    error UnsupportedChain();
    error InsufficientSignatures();
    error DuplicateSigner();
    error InvalidSignature();
    error SignerNotRelayer();

    // ============ Modifiers ============

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyRelayer() {
        if (!authorizedRelayers[msg.sender]) revert NotAuthorizedRelayer();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    // ============ Constructor ============

    constructor(uint256 _signatureThreshold) {
        owner = msg.sender;
        signatureThreshold = _signatureThreshold;
        vaultImplementation = address(new DepositVault());

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(NAME)),
                keccak256(bytes(VERSION)),
                block.chainid,
                address(this)
            )
        );

        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ============ External Functions ============

    /// @notice Compute deposit address deterministically without deploying
    /// @param user The depositor's address
    /// @param intentId Unique intent identifier
    /// @return vault The address where user should send funds
    function getDepositAddress(
        address user,
        bytes32 intentId
    ) external view returns (address vault) {
        bytes32 salt = _computeSalt(user, intentId);
        vault = vaultImplementation.predictDeterministicAddress(salt, address(this));
    }

    /// @notice Check if vault is already deployed at predicted address
    /// @param vault Address to check
    /// @return True if vault contract exists at address
    function isVaultDeployed(address vault) external view returns (bool) {
        return vault.code.length > 0;
    }

    /// @notice Deploy vault for user+intent
    /// @dev Uses EIP-1167 minimal proxy for gas efficiency (~45k vs ~100k)
    /// @param user The depositor's address
    /// @param intentId Unique intent identifier
    /// @param targetChainId Target chain for the intent (must be supported)
    /// @return vault The deployed vault address
    function createVault(
        address user,
        bytes32 intentId,
        uint256 targetChainId
    ) external whenNotPaused returns (address vault) {
        if (user == address(0)) revert ZeroAddress();
        if (!supportedChains[targetChainId]) revert UnsupportedChain();

        bytes32 salt = _computeSalt(user, intentId);

        // Check if already deployed
        vault = vaultImplementation.predictDeterministicAddress(salt, address(this));
        if (vault.code.length > 0) {
            return vault;
        }

        // Deploy minimal proxy
        vault = vaultImplementation.cloneDeterministic(salt);

        // Initialize vault
        DepositVault(vault).initialize(user, intentId, address(this));

        // Store mapping
        intentToVault[intentId] = vault;
        totalVaults++;

        emit VaultCreated(intentId, vault, user, targetChainId, block.timestamp);
    }

    /// @notice Release funds from vault to recipient with threshold signature verification
    /// @param intentId The intent to release funds for
    /// @param token Token address to release
    /// @param recipient Where to send the funds
    /// @param signatures Concatenated signatures from relayers (65 bytes each)
    function releaseFromVault(
        bytes32 intentId,
        address token,
        address recipient,
        bytes calldata signatures
    ) external whenNotPaused {
        address vault = intentToVault[intentId];
        if (vault == address(0)) revert VaultNotFound();

        uint256 nonce = intentNonces[intentId];

        // Verify threshold signatures
        _verifyThresholdSignatures(intentId, token, recipient, nonce, signatures);

        // Increment nonce to prevent replay
        intentNonces[intentId] = nonce + 1;

        uint256 amount = IERC20(token).balanceOf(vault);
        DepositVault(vault).release(token, recipient);

        emit FundsReleased(intentId, vault, recipient, token, amount, nonce);
    }

    /// @notice Allow user to refund expired intent
    /// @param intentId The intent to refund
    /// @param token Token address to refund
    function refundFromVault(bytes32 intentId, address token) external whenNotPaused {
        address vault = intentToVault[intentId];
        if (vault == address(0)) revert VaultNotFound();

        uint256 amount = IERC20(token).balanceOf(vault);
        address user = DepositVault(vault).user();

        // Vault handles authorization check
        DepositVault(vault).refund(token, msg.sender);

        emit FundsRefunded(intentId, vault, user, token, amount);
    }

    // ============ Admin Functions ============

    /// @notice Add authorized relayer
    /// @param relayer Address to authorize
    function addRelayer(address relayer) external onlyOwner {
        if (relayer == address(0)) revert ZeroAddress();
        if (!authorizedRelayers[relayer]) {
            authorizedRelayers[relayer] = true;
            relayerCount++;
            emit RelayerAdded(relayer, relayerCount);
        }
    }

    /// @notice Remove relayer authorization
    /// @param relayer Address to deauthorize
    function removeRelayer(address relayer) external onlyOwner {
        if (authorizedRelayers[relayer]) {
            authorizedRelayers[relayer] = false;
            relayerCount--;
            emit RelayerRemoved(relayer, relayerCount);
        }
    }

    /// @notice Update signature threshold
    /// @param newThreshold New required signature count
    function setSignatureThreshold(uint256 newThreshold) external onlyOwner {
        if (newThreshold == 0 || newThreshold > relayerCount) revert InvalidThreshold();
        uint256 oldThreshold = signatureThreshold;
        signatureThreshold = newThreshold;
        emit ThresholdUpdated(oldThreshold, newThreshold);
    }

    /// @notice Add supported target chain
    /// @param chainId Chain ID to support
    function addSupportedChain(uint256 chainId) external onlyOwner {
        supportedChains[chainId] = true;
        emit ChainAdded(chainId);
    }

    /// @notice Remove supported target chain
    /// @param chainId Chain ID to remove
    function removeSupportedChain(uint256 chainId) external onlyOwner {
        supportedChains[chainId] = false;
        emit ChainRemoved(chainId);
    }

    /// @notice Pause the contract
    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpause the contract
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Transfer contract ownership
    /// @param newOwner New owner address
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // ============ Internal Functions ============

    /// @notice Compute deterministic salt from user and intent ID
    function _computeSalt(
        address user,
        bytes32 intentId
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, intentId));
    }

    /// @notice Verify N-of-M threshold signatures from relayers
    /// @dev Uses EIP-712 typed data signing
    function _verifyThresholdSignatures(
        bytes32 intentId,
        address token,
        address recipient,
        uint256 nonce,
        bytes calldata signatures
    ) internal view {
        if (signatures.length < signatureThreshold * 65) {
            revert InsufficientSignatures();
        }

        // Build EIP-712 digest
        bytes32 structHash = keccak256(
            abi.encode(
                RELEASE_TYPEHASH,
                intentId,
                token,
                recipient,
                nonce
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        // Track unique signers to prevent duplicate signatures
        address[] memory signers = new address[](signatureThreshold);
        uint256 validSignatures = 0;

        for (uint256 i = 0; i < signatures.length / 65 && validSignatures < signatureThreshold; i++) {
            bytes memory sig = signatures[i * 65:(i + 1) * 65];
            address signer = digest.recover(sig);

            // Verify signer is authorized relayer
            if (!authorizedRelayers[signer]) {
                revert SignerNotRelayer();
            }

            // Check for duplicate signer
            for (uint256 j = 0; j < validSignatures; j++) {
                if (signers[j] == signer) {
                    revert DuplicateSigner();
                }
            }

            signers[validSignatures] = signer;
            validSignatures++;
        }

        if (validSignatures < signatureThreshold) {
            revert InsufficientSignatures();
        }
    }

    // ============ View Functions ============

    /// @notice Get vault details for an intent
    /// @param intentId The intent ID to query
    /// @return vault Vault address
    /// @return user Original depositor
    /// @return isExpired Whether vault has expired
    /// @return isProcessed Whether funds have been released or refunded
    function getVaultDetails(bytes32 intentId)
        external
        view
        returns (
            address vault,
            address user,
            bool isExpired,
            bool isProcessed
        )
    {
        vault = intentToVault[intentId];
        if (vault != address(0)) {
            DepositVault v = DepositVault(vault);
            user = v.user();
            isExpired = v.isExpired();
            isProcessed = v.released() || v.refunded();
        }
    }

    /// @notice Get the current nonce for an intent
    /// @param intentId The intent ID to query
    /// @return Current nonce value
    function getNonce(bytes32 intentId) external view returns (uint256) {
        return intentNonces[intentId];
    }

    /// @notice Compute the EIP-712 digest for a release operation
    /// @dev Useful for relayers to sign the correct message
    function getReleaseDigest(
        bytes32 intentId,
        address token,
        address recipient,
        uint256 nonce
    ) external view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                RELEASE_TYPEHASH,
                intentId,
                token,
                recipient,
                nonce
            )
        );

        return keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );
    }
}
