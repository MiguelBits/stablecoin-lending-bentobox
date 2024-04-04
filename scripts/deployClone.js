const hre = require("hardhat");
const { Contract } = require("hardhat/internal/hardhat-network/stack-traces/model");

async function main() {

  const bento = await hre.ethers.getContractAt("BentoBoxV1", '0xe373067EBF5bac9066Db4FBA6918090806824A98')
  const ChamberMasterContract = '0xB9A1396263A89aD32c93C8858f6F03a78F373dd7'; // Chamber

  const collateral = "0x7A51f19c68181759D4827cB623D70Dfd6110Cab7"; // wETH
  const oracle = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e"
  const oracleData = "0x0000000000000000000000000000000000000000";

  let INTEREST_CONVERSION = 1e18/(365.25*3600*24)/100
  let interest = parseInt(String(0 * INTEREST_CONVERSION))
  const OPENING_CONVERSION = 1e5/100
  const opening = 0.5 * OPENING_CONVERSION
  const liquidation = 4 * 1e3+1e5
  const collateralization = 90 * 1e3

  let initData = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "bytes", "uint64", "uint256", "uint256", "uint256"],
    [collateral, oracle, oracleData, interest, liquidation, collateralization, opening]
  );

  console.log('deploying clone...');
  const tx = await (await bento.deploy(ChamberMasterContract, initData, true)).wait();

  const deployEvent = tx?.events?.[0];
  console.log('Clone contract Successfully Deployed: ', deployEvent.args.cloneAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  