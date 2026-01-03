// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IDepositVault
/// @notice Interface for DepositVault contract
interface IDepositVault {
    // Events
    event Initialized(address indexed user, bytes32 indexed intentId, address factory);
    event Released(address indexed token, address indexed recipient, uint256 amount);
    event Refunded(address indexed token, address indexed user, uint256 amount);

    // Errors
    error AlreadyInitialized();
    error OnlyFactory();
    error AlreadyProcessed();
    error NotOriginalUser();
    error NotExpiredYet();
    error NoBalance();

    // Functions
    function initialize(address _user, bytes32 _intentId, address _factory) external;
    function release(address token, address recipient) external;
    function refund(address token, address caller) external;
    function getBalance(address token) external view returns (uint256);
    function isExpired() external view returns (bool);
    function isProcessed() external view returns (bool);
    function timeUntilExpiry() external view returns (uint256);

    // State variables (getters)
    function user() external view returns (address);
    function intentId() external view returns (bytes32);
    function factory() external view returns (address);
    function createdAt() external view returns (uint256);
    function released() external view returns (bool);
    function refunded() external view returns (bool);
    function EXPIRY_TIME() external view returns (uint256);
}
