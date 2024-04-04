pragma solidity 0.6.12;

import "forge-std/Test.sol";
pragma experimental ABIEncoderV2;
import "forge-std/StdJson.sol";

import {ChamberFlat, IBentoBoxV1, SenUSD, ISwapper} from "../../contracts/ChamberFlat.sol";
import {BentoBoxV1, IERC20} from "../../contracts/BentoBoxFlat.sol";

interface IChamber {

}

interface DIAOracle {
    function setValue(string memory key, uint128 value, uint128 timestamp) external;
}

interface WETH{
    function deposit() external payable;
    function withdraw(uint256 wad) external;
}

interface MarketLens{
    struct UserPosition {
        address chamber;
        address account;
        uint256 ltvBps;
        uint256 healthFactor;
        uint256 borrowValue;
        AmountValue collateral;
        uint256 liquidationPrice;
    }

    struct AmountValue {
        uint256 amount;
        uint256 value;
    }

    function getUserPosition(
        IChamber chamber,
        address account
    )
        external
        view
        returns (
            UserPosition memory
        );

    function getCollateralPrice(IChamber chamber) external view returns (uint256);
    function getUserMaxBorrow(IChamber chamber, address account) external view returns (uint256);
}
contract Helper is Test {
    using stdJson for string;

    address user = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address dia_oracleUpdater = 0xC237B66d9C5dC46e3785618635153E8cc90f98B9; //ARBITRUM

    //arbitrum weth
    IERC20 public weth = IERC20(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1); //TODO change
    BentoBoxV1 bentoBox;
    SenUSD public senUSD;
    address owner;
    ChamberFlat public chamber;
    address masterChamber;
    address treasury;
    MarketLens marketLens;

    function readDeployedAddresses() public{
        string memory root = vm.projectRoot();
        // console.log("root", root);
        string memory path;
        // path = string.concat(root, "/deployments.json");
        path = string(abi.encodePacked(root, "/local_deployments.json"));
        // console.log("path", path);

        string memory json = vm.readFile(path);
        bytes memory parseJsonByteCode = json.parseRaw(".BentoBox.address");
        bentoBox = BentoBoxV1(abi.decode(parseJsonByteCode, (address)));
        console.log("bentoBox", address(bentoBox));

        owner = bentoBox.owner();
        console.log("owner", owner);

        parseJsonByteCode = json.parseRaw(".Chamber.address");
        masterChamber = abi.decode(parseJsonByteCode, (address));

        parseJsonByteCode = json.parseRaw(".SenUSD.address");
        senUSD = SenUSD(abi.decode(parseJsonByteCode, (address)));

        parseJsonByteCode = json.parseRaw(".CloneContract.address");
        chamber = ChamberFlat(abi.decode(parseJsonByteCode, (address)));

        treasury = chamber.feeTo();
        console.log("treasury", treasury);

        parseJsonByteCode = json.parseRaw(".MarketLensV2.address");
        marketLens = MarketLens(abi.decode(parseJsonByteCode, (address)));
    }
    
    function testDecode() public{
        //11
        console.log("! 11 !");
        bytes memory data = hex'000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
        (bool must_update, uint256 minRate, uint256 maxRate) = abi.decode(data, (bool, uint256, uint256));
        console.log("must_update", must_update);
        console.log("minRate", minRate);
        console.log("maxRate", maxRate);

        //5
        console.log("! 5 !");
        data = hex'0000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000ac0d2cf77a8f8869069fc45821483701a264933b';
        (int256 amount, address to) = abi.decode(data, (int256, address));
        console.logInt(amount);
        console.log("to", to);

        //21
        console.log("! 21 !");
        data = hex'00000000000000000000000099d8a9c45b2eca8864373a26d1459e3dff1e17f3000000000000000000000000ac0d2cf77a8f8869069fc45821483701a264933b0000000000000000000000000000000000000000000000000000000000000000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe';
        (IERC20 token, address _to, int256 _amount, int256 share) = abi.decode(data, (IERC20, address, int256, int256));
        console.log("token", address(token));
        console.log("to", _to);
        console.logInt(_amount);
        console.logInt(share);

        //20
        console.log("! 20 !");
        data = hex'0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000390db10e65b5ab920c19149c919d970ad9d18a4100000000000000000000000000000000000000000000000000038d7ea4c680000000000000000000000000000000000000000000000000000000000000000000';
        (token, to, _amount, share) = abi.decode(data, (IERC20, address, int256, int256));
        console.log("token", address(token));
        console.log("to", to);
        console.logInt(_amount);
        console.logInt(share);

        //10
        console.log("! 10 !"); bool skim;
        data = hex'fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe000000000000000000000000ac0d2cf77a8f8869069fc45821483701a264933b0000000000000000000000000000000000000000000000000000000000000001';
        (share, to, skim) = abi.decode(data, (int256, address, bool));
        console.logInt(share);
        console.log("to", to);
        console.log("skim", skim);

    }

    function deposit(uint256 amount) internal returns(uint8[] memory, uint256[] memory, bytes[] memory)
    {
        uint8[] memory actions = new uint8[](3);
        uint256[] memory values = new uint256[](3);
        bytes[] memory datas = new bytes[](3);

        console.log("ACTION_UPDATE_EXCHANGE_RATE");
        actions[0] = 11; //ACTION_UPDATE_EXCHANGE_RATE
        values[0] = 0;
        datas[0] = abi.encode(true, 0, 0); //must_update, minRate, maxRate

        console.log("ACTION_BENTO_DEPOSIT");
        actions[1] = 20; //ACTION_BENTO_DEPOSIT
        values[1] = amount; //amount
        datas[1] = abi.encode(IERC20(0), address(chamber), amount, 0); //token, to, amount, share

        int256 share = -2;
        console.log("ACTION_ADD_COLLATERAL");
        actions[2] = 10; //ACTION_ADD_COLLATERAL
        values[2] = 0;
        datas[2] = abi.encode(share, user, true); //share, to, skim

        return(actions, values, datas);
    }

    function borrow_deposit(address _user, int256 amount, int256 borrow) internal returns(uint8[] memory, uint256[] memory, bytes[] memory)
    {
        uint8[] memory actions = new uint8[](5);
        uint256[] memory values = new uint256[](5);
        bytes[] memory datas = new bytes[](5);

        console.log("ACTION_UPDATE_EXCHANGE_RATE");
        actions[0] = 11; //ACTION_UPDATE_EXCHANGE_RATE
        values[0] = 0;
        datas[0] = abi.encode(true, 0, 0); //must_update, minRate, maxRate

        console.log("ACTION_BORROW");
        actions[1] = 5; //ACTION_BORROW
        values[1] = 0;
        datas[1] = abi.encode(borrow, _user);
        
        int256 share = -2;
        console.log("ACTION_BENTO_WITHDRAW");
        actions[2] = 21; //ACTION_BENTO_WITHDRAW
        values[2] = 0;
        datas[2] = abi.encode(IERC20(address(senUSD)), _user, 0, share); //token, to, amount, share

        console.log("ACTION_BENTO_DEPOSIT");
        actions[3] = 20; //ACTION_BENTO_DEPOSIT
        values[3] = uint256(amount); //amount
        datas[3] = abi.encode(IERC20(0), address(chamber), amount, 0); //token, to, amount, share

        console.log("ACTION_ADD_COLLATERAL");
        actions[4] = 10; //ACTION_ADD_COLLATERAL
        values[4] = 0;
        datas[4] = abi.encode(share, _user, true); //share, to, skim

        return(actions, values, datas);
    }

}