// SPDX-License-Identifier: MIT

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";

pragma solidity >=0.5.0 <0.8.0;

    interface OracleInterface {
        function assetPriceFeed(address _asset) external view returns (IAggregatorV3);
        function getOraclePrice(address _asset) external view returns (int256); 
        function getSpotPrice(address _asset) external view returns (uint256); 
        function getAmountPriced(uint256 _amount, address _asset) external view returns (uint256); 
        function getAmountInAsset(uint256 _amount, address _asset) external view returns (uint256);
    }

    interface governanceLockInterface {
        function getUserLock(address account, uint256 index) external view returns(uint256 amount, uint256 start, bool renewed);
        function userLockCount(address account) external view returns(uint256 count);
    }

    interface IEngines {
    function s_SenUSDMinted(address user) external view returns (uint256);
    function s_SenUSD_Debt(address user) external view returns (uint256);
    function s_SenUSDMintedLastTimestamp(address user) external view returns (uint40);
    function getAccountCollateralValue(address user) external view returns (uint256);
    }

    interface IERC20 {
    function decimals() external view returns (uint8);
     function balanceOf(address account) external view returns (uint256);
    }


    interface IAggregatorV3 {
        function latestAnswer() external view returns (int256);
    }

contract stableEngineMap {

    struct CollateralInfo {
        address collateralTokenAddress;
        address stableEngineAddress;
    }

    CollateralInfo[] public collateralList;
    address public borrowEngine;

    constructor(address _borrowEngine) public {
        borrowEngine = _borrowEngine;
    }

    function addCollateralInfo(address _collateralTokenAddress, address _stableEngineAddress) public {
        CollateralInfo memory newCollateralInfo = CollateralInfo({
            collateralTokenAddress: _collateralTokenAddress,
            stableEngineAddress: _stableEngineAddress
        });

        collateralList.push(newCollateralInfo);
    }
}
