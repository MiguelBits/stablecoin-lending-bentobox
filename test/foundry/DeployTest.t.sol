pragma solidity 0.6.12;

import "forge-std/Test.sol";
pragma experimental ABIEncoderV2;

import "./Helper.t.sol";

contract UserTest is Helper {

    uint256 mintedUSDSupply = 10000 ether;

    function setUp() public {
        vm.createSelectFork(vm.envString("LOCAL_URL"));
        
        readDeployedAddresses();

        vm.prank(owner);
        senUSD.mintToBentoBox(address(chamber), mintedUSDSupply, IBentoBoxV1(address(bentoBox)));
        console.log("bento box senUSD", senUSD.balanceOf(address(bentoBox)));

        treasury = ChamberFlat(masterChamber).feeTo();
        console.log("treasury", treasury);
    }

    function testOracle() public {
        uint price = marketLens.getCollateralPrice(IChamber(address(chamber)));
        console.log("price", price);
        assertTrue(price > 0);
    }

    function testDepositBorrowEth() public {        
        uint256 user_bal = user.balance;
        console.log("user_bal", user_bal);
        uint256 user_senUSD = senUSD.balanceOf(user);
        console.log("user_senUSD", user_senUSD);

        int256 amount = 1 ether;
        int256 borrow = 100 ether;
        (uint8[] memory actions, uint256[] memory values, bytes[] memory datas) = borrow_deposit(user, amount, borrow);

        vm.startPrank(user);

        bentoBox.setMasterContractApproval(user, masterChamber, true, 0, 0, 0);
        chamber.cook{value: uint256(amount)}(
            actions,
            values,
            datas
        );
        vm.stopPrank();

        MarketLens.UserPosition memory userPosition = marketLens.getUserPosition(IChamber(address(chamber)), user);
        console.log("user ltv", userPosition.ltvBps);
        console.log("user healthFactor", userPosition.healthFactor);
        console.log("user borrowValue", userPosition.borrowValue);
        console.log("user collateralValue", userPosition.collateral.value);
        console.log("user liquidationPrice", userPosition.liquidationPrice);
        console.log("user collateralAmount", userPosition.collateral.amount);

        console.log("user_bal diff", user_bal - user.balance);
        assertTrue(user_bal - user.balance == uint(amount));

        console.log("user_senUSD diff", senUSD.balanceOf(user) - user_senUSD);
        assertTrue(senUSD.balanceOf(user) - user_senUSD == uint(borrow));

        console.log("bento box weth", weth.balanceOf(address(bentoBox)));
        assertTrue(weth.balanceOf(address(bentoBox)) == uint(amount));

        console.log("bento box senUSD", senUSD.balanceOf(address(bentoBox)));
        assertTrue(senUSD.balanceOf(address(bentoBox)) == mintedUSDSupply - uint(borrow));

        (uint64 lastAccrued,
        uint128 feesEarned,
        uint64 INTEREST_PER_SECOND) = chamber.accrueInfo();

        console.log("lastAccrued", lastAccrued);
        console.log("feesEarned", feesEarned);
        console.log("INTEREST_PER_SECOND", INTEREST_PER_SECOND);
    }

    function testWithdrawFees() public {
        testDepositBorrowEth();

        console.log("WARP");
        vm.warp(block.timestamp + 100 days);
        chamber.accrue();
        (uint64 lastAccrued,
        uint128 feesEarned,
        uint64 INTEREST_PER_SECOND) = chamber.accrueInfo();
        console.log("lastAccrued", lastAccrued);
        console.log("feesEarned", feesEarned);
        console.log("INTEREST_PER_SECOND", INTEREST_PER_SECOND);

        console.log(" AND CLAIM FEES");
        chamber.withdrawFees();

        uint256 share = bentoBox.balanceOf(IERC20(address(senUSD)), treasury);
        vm.startPrank(treasury);
        bentoBox.withdraw(IERC20(address(senUSD)), treasury, treasury, 0, share);
        vm.stopPrank();

        (lastAccrued,
        feesEarned,
        INTEREST_PER_SECOND) = chamber.accrueInfo();
        console.log("lastAccrued", lastAccrued);
        console.log("feesEarned", feesEarned);
        console.log("INTEREST_PER_SECOND", INTEREST_PER_SECOND);

        console.log("senUSD treasury", senUSD.balanceOf(treasury));

        assertTrue(senUSD.balanceOf(treasury) > 0);
        assertTrue(lastAccrued == block.timestamp);
        assertTrue(feesEarned == 0);
    }

    function testLiquidation() public {
        //log collateral price
        uint256 collateralPrice = marketLens.getCollateralPrice(IChamber(address(chamber)));
        console.log("collateralPrice", collateralPrice);

        uint256 user_bal = user.balance;
        console.log("user_bal", user_bal);
        uint256 user_senUSD = senUSD.balanceOf(user);
        console.log("user_senUSD", user_senUSD);

        int256 amount = 1 ether;
        int256 borrow = 1000 ether;
        (uint8[] memory actions, uint256[] memory values, bytes[] memory datas) = borrow_deposit(user, amount, borrow);

        vm.startPrank(user);
        bentoBox.setMasterContractApproval(user, masterChamber, true, 0, 0, 0);
        chamber.cook{value: uint256(amount)}(
            actions,
            values,
            datas
        );
        vm.stopPrank();        

        MarketLens.UserPosition memory userPosition = marketLens.getUserPosition(IChamber(address(chamber)), user);
        console.log("user ltv", userPosition.ltvBps);
        console.log("user healthFactor", userPosition.healthFactor);
        console.log("user borrowValue", userPosition.borrowValue);
        console.log("user collateralValue", userPosition.collateral.value);
        console.log("user liquidationPrice", userPosition.liquidationPrice);
        console.log("user collateralAmount", userPosition.collateral.amount);

        vm.startPrank(dia_oracleUpdater);
        DIAOracle(address(chamber.oracle().aggregator())).setValue("ETH/USD", uint128(userPosition.liquidationPrice/1e10), uint128(block.timestamp));
        vm.stopPrank();

        //log user max borrow
        uint256 userMaxBorrow = marketLens.getUserMaxBorrow(IChamber(address(chamber)), user);
        console.log("userMaxBorrow", userMaxBorrow);

        userPosition = marketLens.getUserPosition(IChamber(address(chamber)), user);
        console.log("user ltv", userPosition.ltvBps);
        console.log("user healthFactor", userPosition.healthFactor);
        console.log("user collateralValue", userPosition.collateral.value);
        console.log("user liquidationPrice", userPosition.liquidationPrice);

        chamber.accrue();
        (,
        uint128 feesEarned_old,
        ) = chamber.accrueInfo();
        console.log("feesEarned", feesEarned_old);

        /////////////////////// start liquidator ///////////////////////

        address[] memory users = new address[](1);
        users[0] = user;
        uint256[] memory liquidatedAmounts = new uint256[](1);
        liquidatedAmounts[0] = uint256(userPosition.collateral.amount);

        address to = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        uint256 debtRepay = 200 ether;
        (actions, values, datas) = borrow_deposit(to, amount, int(debtRepay));
        
        vm.startPrank(to);

        bentoBox.setMasterContractApproval(to, masterChamber, true, 0, 0, 0);
        
        //get senUSD
        chamber.cook{value: uint256(amount)}(
            actions,
            values,
            datas
        );

        //deposit senUSD
        senUSD.approve(address(bentoBox), uint256(debtRepay));
        bentoBox.deposit(IERC20(address(senUSD)), to, to, uint256(debtRepay), 0);

        //liquidate
        chamber.liquidate(users, liquidatedAmounts, to, ISwapper(address(0)));

        vm.stopPrank();

        /////////////////////// end liquidator ///////////////////////

        userPosition = marketLens.getUserPosition(IChamber(address(chamber)), user);
        console.log("user ltv", userPosition.ltvBps);
        console.log("user healthFactor", userPosition.healthFactor);
        console.log("user borrowValue", userPosition.borrowValue);
        console.log("user collateralValue", userPosition.collateral.value);
        console.log("user liquidationPrice", userPosition.liquidationPrice);
        console.log("user collateralAmount", userPosition.collateral.amount);

        assertTrue(userPosition.healthFactor != 0, "user healthFactor should not be 0");
        assertTrue(userPosition.collateral.amount < uint(amount), "user collateral amount should be taken");

        console.log("to weth balance", weth.balanceOf(to));
        console.log("to senUSD balance", senUSD.balanceOf(to));

        //should have 0 senUSD and some weth
        assertTrue(weth.balanceOf(to) > 0, "to weth balance should be > 0");
        assertTrue(senUSD.balanceOf(to) == 0, "to senUSD balance should be 0");

        (,
        uint128 feesEarned_new,
        ) = chamber.accrueInfo();
        console.log("feesEarned", feesEarned_new);

        assertTrue(feesEarned_new > feesEarned_old, "feesEarned_new should be > feesEarned_old");
    }

    function testMaxLTV() public {
        uint price = marketLens.getCollateralPrice(IChamber(address(chamber)));
        uint maxLTV = chamber.COLLATERIZATION_RATE();
        console.log("maxLTV", maxLTV);
        console.log("price", price);

        int256 amount = 1 ether;
        maxLTV = (uint(amount) * price / 1e18) * maxLTV*1e13 / 1e18;
        console.log("user maxLTV", maxLTV); 
        int256 borrow = int(maxLTV) - 10 ether;
        (uint8[] memory actions, uint256[] memory values, bytes[] memory datas) = borrow_deposit(user, amount, borrow);

        vm.startPrank(user);

        bentoBox.setMasterContractApproval(user, masterChamber, true, 0, 0, 0);
        chamber.cook{value: uint256(amount)}(
            actions,
            values,
            datas
        );
        vm.stopPrank();

        //log ltv
        MarketLens.UserPosition memory userPosition = marketLens.getUserPosition(IChamber(address(chamber)), user);
        console.log("user ltv", userPosition.ltvBps);
        console.log("user healthFactor", userPosition.healthFactor);
        console.log("user liquidationPrice", userPosition.liquidationPrice);

        /////////////////////// start liquidator ///////////////////////

        address[] memory users = new address[](1);
        users[0] = user;
        uint256[] memory liquidatedAmounts = new uint256[](1);
        liquidatedAmounts[0] = uint256(userPosition.collateral.amount);

        address to = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        uint256 debtRepay = 200 ether;
        (actions, values, datas) = borrow_deposit(to, amount, int(debtRepay));

        vm.startPrank(to);

        bentoBox.setMasterContractApproval(to, masterChamber, true, 0, 0, 0);
        
        //get senUSD
        chamber.cook{value: uint256(amount)}(
            actions,
            values,
            datas
        );

        //deposit senUSD
        senUSD.approve(address(bentoBox), uint256(debtRepay));
        bentoBox.deposit(IERC20(address(senUSD)), to, to, uint256(debtRepay), 0);

        //revert liquidate
        vm.expectRevert("Chamber: all are solvent");
        chamber.liquidate(users, liquidatedAmounts, to, ISwapper(address(0)));
        vm.stopPrank();

        vm.startPrank(dia_oracleUpdater);
        DIAOracle(address(chamber.oracle().aggregator())).setValue("ETH/USD", uint128((price - 10 ether)/1e10), uint128(block.timestamp));
        vm.stopPrank();

        vm.startPrank(to);
        chamber.liquidate(users, liquidatedAmounts, to, ISwapper(address(0)));
        vm.stopPrank();

        /////////////////////// end liquidator ///////////////////////
    }

}