const hre = require("hardhat");
const { Contract } = require("hardhat/internal/hardhat-network/stack-traces/model");
const fs = require('fs');

async function main() {
  const WETH = "0x7A51f19c68181759D4827cB623D70Dfd6110Cab7";
  const treasury = "0xaC0D2cF77a8F8869069fc45821483701A264933B";
  const ETH_USD_ORACLE = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e";
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

  console.log('deploying Registry Contract...')
  const registry = await hre.ethers.getContractFactory("stableEngineMap");
  const RegistryContract = await registry.deploy(oracleContract.address,
    '0xb9F89C0e0B1DcC5D031627245Df1131AcD079506',
    deployEvent.args.cloneAddress,
    1,
    600,
    16,
    '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    '0x7c2208a5aC67681dEE411af3FDAa7235e8b468d6',
    '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    3000);
  await RegistryContract.deployed();

  console.log('Registry Successfully Deployed: ', RegistryContract.address);


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
    CloneOracle: { // Name this appropriately
        address: oracleContract.address,
        parameters: [ETH_USD_ORACLE]
    },
    MarketLensV2: {
        address: MarketLensV2.address,
        parameters: [] // Empty array since no parameters for deployment
    },
    RegistryContract: {
      address: RegistryContract.address,
      parameters: [oracleContract.address,
        '0xb9F89C0e0B1DcC5D031627245Df1131AcD079506',
        deployEvent.args.cloneAddress,
        1,
        600,
        16,
        '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        '0x7c2208a5aC67681dEE411af3FDAa7235e8b468d6',
        '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
        3000] // Empty array since no parameters for deployment
  }
};

// Save the deployments to JSON file
fs.writeFileSync('deploymentsGoerli.json', JSON.stringify(deployments, null, 2));

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
