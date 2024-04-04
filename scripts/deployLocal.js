const hre = require("hardhat");
const { Contract } = require("hardhat/internal/hardhat-network/stack-traces/model");
const fs = require('fs');

async function main() {
  const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const treasury = "0xaC0D2cF77a8F8869069fc45821483701A264933B";
  const ETH_USD_ORACLE = "0xd041478644048d9281f88558E6088e9da97df624"; //TODO CHANGE Dia Oracle
  const ORACLE_KEY = "ETH/USD";

  const bento = await hre.ethers.getContractFactory("BentoBoxV1");
  console.log('bentobox deploying...')
  const bentobox = await bento.deploy(WETH);
  
  await bentobox.deployed();

  const chamber = await hre.ethers.getContractFactory("ChamberFlat");
  const senUsd = await hre.ethers.getContractFactory("SenecaUSD");
  console.log('senUSD deploying...')
  const senUSD = await senUsd.deploy();
  await senUSD.deployed();
  console.log('chamber deploying...')
  const Chamber = await chamber.deploy(bentobox.address, senUSD.address);
  await Chamber.deployed();
  await Chamber.setFeeTo(treasury);
  await bentobox.whitelistMasterContract(Chamber.address, true);

  console.log(
    `BentoBox Successfully Deployed`, bentobox.address
  );

  console.log(
    `Chamber Contract Successfully Deployed`, Chamber.address
  );

  console.log(
    `SenUSD Contract Successfully Deployed`, senUSD.address
  );

  const BentoBox = await ethers.getContractAt("BentoBoxV1", bentobox.address);
  const ChamberMasterContract = Chamber.address; // Chamber

  // Deploying Clone Contract ////////////////////////////////////////////////////////////////////   WETH
  const Oracle = await hre.ethers.getContractFactory("SenecaOracle");
  const oracleContract = await Oracle.deploy(ETH_USD_ORACLE, ORACLE_KEY);

  const collateral = WETH; // wETH
  const oracleData = "0x0000000000000000000000000000000000000000";

  // let INTEREST_CONVERSION = 1e18/(365.25*3600*24)/100
  let interest = parseInt(158440439)
  const OPENING_CONVERSION = 1e5/100
  const opening = 0.5 * OPENING_CONVERSION
  const liquidation = 4 * 1e3+1e5
  const collateralization = 90 * 1e3

  let initData = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "bytes", "uint64", "uint256", "uint256", "uint256"],
    [collateral, oracleContract.address, oracleData, interest, liquidation, collateralization, opening]
  );

  console.log('initialising chamber...');
  const initChamber = Chamber.attach(Chamber.address);
  await (await initChamber.init(initData)).wait();
  console.log('initialised chamber');
  console.log('deploying clone...');
  const tx = await (await BentoBox.deploy(ChamberMasterContract, initData, true)).wait();

  const deployEvent = tx?.events?.[0];
  console.log('Clone contract Successfully Deployed: ', deployEvent.args.cloneAddress);
  ////////////////////////////////////////////////////////////////////////////////////////////

  console.log('deploying Market Lens...')
  const marketLens = await hre.ethers.getContractFactory("MarketLens");
  const MarketLensV2 = await marketLens.deploy();
  
  await MarketLensV2.deployed();

  console.log('Market Lens Successfully Deployed: ', MarketLensV2.address);

  //Deployments

  const deployments = {
    BentoBox: {
        address: bentobox.address,
        parameters: [WETH]
    },
    SenUSD: {
        address: senUSD.address,
        parameters: [] // Empty array since no parameters for deployment
    },
    Chamber: {
        address: Chamber.address,
        parameters: [bentobox.address, senUSD.address]
    },
    CloneContract: { // Name this appropriately
        address: deployEvent.args.cloneAddress,
        parameters: [ChamberMasterContract, initData, true]
    },
    MarketLensV2: {
        address: MarketLensV2.address,
        parameters: [] // Empty array since no parameters for deployment
    }
};

// Save the deployments to JSON file
fs.writeFileSync('local_deployments.json', JSON.stringify(deployments, null, 2));

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
