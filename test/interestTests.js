'use strict';

const { loadFixture, time } = require('@nomicfoundation/hardhat-network-helpers');
const { increaseTo } = require('@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time');

const { expect } = require('chai');
const { parse } = require('dotenv');
const { BigNumber } = require('ethers');
const { ethers, hardhatArguments } = require('hardhat');
const { actions } = require('./helpers/signAndParse');
const { generateSignature } = require('./helpers/generateSignature');
const { parseUnits } = require('ethers/lib/utils');
const { addEmitHelpers } = require('typescript');
// eslint-disable-next-line max-lines-per-function
describe('Seneca Contract', () => {


  async function deploySecondFixture() {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    const chamber = await hre.ethers.getContractFactory("ChamberFlat");
    const senUsd = await hre.ethers.getContractFactory("SenecaUSD");
    console.log('senUSD deploying...')
    const senUSD = await senUsd.deploy();
    await senUSD.deployed();
    console.log('chamber deploying...')
    const bentoBox = await ethers.getContractAt("BentoBoxV1", '0x6Aa8986080085791e9872432b8603C2198d7aA18');
    const BentoBox = bentoBox.attach('0x6Aa8986080085791e9872432b8603C2198d7aA18');

    const chamberFlat = await chamber.deploy(BentoBox.address, senUSD.address);
    await chamberFlat.deployed();

    const mocketh = await hre.ethers.getContractAt("ERC20Mock", '0x7A51f19c68181759D4827cB623D70Dfd6110Cab7');
    const mock = await mocketh.attach('0x7A51f19c68181759D4827cB623D70Dfd6110Cab7');

    const chamberFlatMasterContract = chamberFlat.address; // chamberFlat
  
    const collateral = "0x7A51f19c68181759D4827cB623D70Dfd6110Cab7"; // wETH
    const oracle = "0x1552Ba15bB32e0FEfb69541C9074E8291E7761b8"
    const oracleData = "0x0000000000000000000000000000000000000000";
  
    let INTEREST_CONVERSION = 1e18/(365.25*3600*24)/100
    let interest = parseInt(String(5 * INTEREST_CONVERSION))
    const OPENING_CONVERSION = 1e5/100
    const opening = 3.5 * OPENING_CONVERSION
    const liquidation = 4 * 1e3+1e5
    const collateralization = 90 * 1e3
  
    let initData = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "bytes", "uint64", "uint256", "uint256", "uint256"],
      [collateral, oracle, oracleData, interest, liquidation, collateralization, opening]
    );
  
    console.log('initialising chamber...');
    const initCauldron = chamberFlat.attach(chamberFlat.address);
    await (await initCauldron.init(initData)).wait();
    console.log('initialised chamber');
    console.log('deploying clone...');
    const tx = await (await BentoBox.deploy(chamberFlatMasterContract, initData, true)).wait();
  
    const deployEvent = tx?.events?.[0];
    console.log('Clone contract Successfully Deployed: ', deployEvent.args.cloneAddress);
    const cloneAddress = deployEvent.args.cloneAddress;
    await senUSD.mintToBentoBox(cloneAddress, parseUnits('100000', 18), BentoBox.address);

    const marketLens = await hre.ethers.getContractAt("MarketLens", '0xebB397119fb6FF976fD6034F3dC7cD43a47C966E');

    return {
       owner, addr1, addr2, addr3, BentoBox, chamberFlatMasterContract, senUSD, chamber, collateral, cloneAddress, mock, marketLens 
    };
}

async function deployTenApyFixture() {
  const [owner, addr1, addr2, addr3] = await ethers.getSigners();
  
  const chamber = await hre.ethers.getContractFactory("ChamberFlat");
  const senUsd = await hre.ethers.getContractFactory("SenecaUSD");
  
  console.log('senUSD deploying...')
  const senUSD = await senUsd.deploy();
  await senUSD.deployed();
  console.log('chamber deploying...')
  const bentoBox = await ethers.getContractAt("BentoBoxV1", '0x6Aa8986080085791e9872432b8603C2198d7aA18');
  const BentoBox = bentoBox.attach('0x6Aa8986080085791e9872432b8603C2198d7aA18');

  const chamberFlat = await chamber.deploy(BentoBox.address, senUSD.address);
  await chamberFlat.deployed();

  const mocketh = await hre.ethers.getContractAt("ERC20Mock", '0x7A51f19c68181759D4827cB623D70Dfd6110Cab7');
  const mock = await mocketh.attach('0x7A51f19c68181759D4827cB623D70Dfd6110Cab7');

  const chamberFlatMasterContract = chamberFlat.address; // chamberFlat

  const collateral = "0x7A51f19c68181759D4827cB623D70Dfd6110Cab7"; // wETH
  const oracle = "0x1552Ba15bB32e0FEfb69541C9074E8291E7761b8"
  const oracleData = "0x0000000000000000000000000000000000000000";

  let INTEREST_CONVERSION = 1e18/(365.25*3600*24)/100
  let interest = parseInt(String(10 * INTEREST_CONVERSION))
  const OPENING_CONVERSION = 1e5/100
  const opening = 0 * OPENING_CONVERSION
  const liquidation = 4 * 1e3+1e5
  const collateralization = 90 * 1e3

  let initData = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "bytes", "uint64", "uint256", "uint256", "uint256"],
    [collateral, oracle, oracleData, interest, liquidation, collateralization, opening]
  );

  console.log('initialising chamber...');
  const initCauldron = chamberFlat.attach(chamberFlat.address);
  await (await initCauldron.init(initData)).wait();
  console.log('initialised chamber');
  console.log('deploying clone...');
  const tx = await (await BentoBox.deploy(chamberFlatMasterContract, initData, true)).wait();

  const deployEvent = tx?.events?.[0];
  console.log('Clone contract Successfully Deployed: ', deployEvent.args.cloneAddress);
  const cloneAddress = deployEvent.args.cloneAddress;
  await senUSD.mintToBentoBox(cloneAddress, parseUnits('100000', 18), BentoBox.address);

  const marketLens = await hre.ethers.getContractAt("MarketLens", '0xebB397119fb6FF976fD6034F3dC7cD43a47C966E');

  return {
     owner, addr1, addr2, addr3, BentoBox, chamberFlatMasterContract, senUSD, chamber, collateral, cloneAddress, mock, marketLens 
  };
}

async function deployFiveApyFixture() {
  const [owner, addr1, addr2, addr3] = await ethers.getSigners();
  
  const chamber = await hre.ethers.getContractFactory("ChamberFlat");
  const senUsd = await hre.ethers.getContractFactory("SenecaUSD");
  
  console.log('senUSD deploying...')
  const senUSD = await senUsd.deploy();
  await senUSD.deployed();
  console.log('chamber deploying...')
  const bentoBox = await ethers.getContractAt("BentoBoxV1", '0x6Aa8986080085791e9872432b8603C2198d7aA18');
  const BentoBox = bentoBox.attach('0x6Aa8986080085791e9872432b8603C2198d7aA18');

  const chamberFlat = await chamber.deploy(BentoBox.address, senUSD.address);
  await chamberFlat.deployed();

  const mocketh = await hre.ethers.getContractAt("ERC20Mock", '0x7A51f19c68181759D4827cB623D70Dfd6110Cab7');
  const mock = await mocketh.attach('0x7A51f19c68181759D4827cB623D70Dfd6110Cab7');

  const chamberFlatMasterContract = chamberFlat.address; // chamberFlat

  const collateral = "0x7A51f19c68181759D4827cB623D70Dfd6110Cab7"; // wETH
  const oracle = "0x1552Ba15bB32e0FEfb69541C9074E8291E7761b8"
  const oracleData = "0x0000000000000000000000000000000000000000";

  let INTEREST_CONVERSION = 1e18/(365.25*3600*24)/100
  let interest = parseInt(String(5 * INTEREST_CONVERSION))
  const OPENING_CONVERSION = 1e5/100
  const opening = 0 * OPENING_CONVERSION
  const liquidation = 4 * 1e3+1e5
  const collateralization = 90 * 1e3

  let initData = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "bytes", "uint64", "uint256", "uint256", "uint256"],
    [collateral, oracle, oracleData, interest, liquidation, collateralization, opening]
  );

  console.log('initialising chamber...');
  const initCauldron = chamberFlat.attach(chamberFlat.address);
  await (await initCauldron.init(initData)).wait();
  console.log('initialised chamber');
  console.log('deploying clone...');
  const tx = await (await BentoBox.deploy(chamberFlatMasterContract, initData, true)).wait();

  const deployEvent = tx?.events?.[0];
  console.log('Clone contract Successfully Deployed: ', deployEvent.args.cloneAddress);
  const cloneAddress = deployEvent.args.cloneAddress;
  await senUSD.mintToBentoBox(cloneAddress, parseUnits('100000', 18), BentoBox.address);

  const marketLens = await hre.ethers.getContractAt("MarketLens", '0xebB397119fb6FF976fD6034F3dC7cD43a47C966E');

  return {
     owner, addr1, addr2, addr3, BentoBox, chamberFlatMasterContract, senUSD, chamber, collateral, cloneAddress, mock, marketLens 
  };
}

async function deployThirdFixture() {
  const [owner, addr1, addr2, addr3] = await ethers.getSigners();
  
  const chamber = await hre.ethers.getContractFactory("ChamberFlat");
  const senUsd = await hre.ethers.getContractFactory("SenecaUSD");
  
  console.log('senUSD deploying...')
  const senUSD = await senUsd.deploy();
  await senUSD.deployed();
  console.log('chamber deploying...')
  const bentoBox = await ethers.getContractAt("BentoBoxV1", '0x6Aa8986080085791e9872432b8603C2198d7aA18');
  const BentoBox = bentoBox.attach('0x6Aa8986080085791e9872432b8603C2198d7aA18');

  const chamberFlat = await chamber.deploy(BentoBox.address, senUSD.address);
  await chamberFlat.deployed();

  const mocketh = await hre.ethers.getContractAt("ERC20Mock", '0x7A51f19c68181759D4827cB623D70Dfd6110Cab7');
  const mock = await mocketh.attach('0x7A51f19c68181759D4827cB623D70Dfd6110Cab7');

  const chamberFlatMasterContract = chamberFlat.address; // chamberFlat

  const collateral = "0x7A51f19c68181759D4827cB623D70Dfd6110Cab7"; // wETH
  const oracle = "0x1552Ba15bB32e0FEfb69541C9074E8291E7761b8"
  const oracleData = "0x0000000000000000000000000000000000000000";

  let INTEREST_CONVERSION = 1e18/(365.25*3600*24)/100
  let interest = parseInt(String(0 * INTEREST_CONVERSION))
  const OPENING_CONVERSION = 1e5/100
  const opening = 10 * OPENING_CONVERSION
  const liquidation = 4 * 1e3+1e5
  const collateralization = 90 * 1e3

  let initData = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "bytes", "uint64", "uint256", "uint256", "uint256"],
    [collateral, oracle, oracleData, interest, liquidation, collateralization, opening]
  );

  console.log('initialising chamber...');
  const initCauldron = chamberFlat.attach(chamberFlat.address);
  await (await initCauldron.init(initData)).wait();
  console.log('initialised chamber');
  console.log('deploying clone...');
  const tx = await (await BentoBox.deploy(chamberFlatMasterContract, initData, true)).wait();

  const deployEvent = tx?.events?.[0];
  console.log('Clone contract Successfully Deployed: ', deployEvent.args.cloneAddress);
  const cloneAddress = deployEvent.args.cloneAddress;
  await senUSD.mintToBentoBox(cloneAddress, parseUnits('100000', 18), BentoBox.address);

  const marketLens = await hre.ethers.getContractAt("MarketLens", '0xebB397119fb6FF976fD6034F3dC7cD43a47C966E');

  return {
     owner, addr1, addr2, addr3, BentoBox, chamberFlatMasterContract, senUSD, chamber, collateral, cloneAddress, mock, marketLens 
  };
}

    async function deployTestingFixture() {
        const [owner, addr1, addr2, addr3] = await ethers.getSigners();
        
        const chamber = await hre.ethers.getContractFactory("ChamberFlat");
        const senUsd = await hre.ethers.getContractFactory("SenecaUSD");
        
        console.log('senUSD deploying...')
        const senUSD = await senUsd.deploy();
        await senUSD.deployed();
        console.log('chamber deploying...')
        const bentoBox = await ethers.getContractAt("BentoBoxV1", '0x6Aa8986080085791e9872432b8603C2198d7aA18');
        const BentoBox = bentoBox.attach('0x6Aa8986080085791e9872432b8603C2198d7aA18');

        const chamberFlat = await chamber.deploy(BentoBox.address, senUSD.address);
        await chamberFlat.deployed();
    
        const mocketh = await hre.ethers.getContractAt("ERC20Mock", '0x7A51f19c68181759D4827cB623D70Dfd6110Cab7');
        const mock = await mocketh.attach('0x7A51f19c68181759D4827cB623D70Dfd6110Cab7');

        const chamberFlatMasterContract = chamberFlat.address; // chamberFlat
      
        const collateral = "0x7A51f19c68181759D4827cB623D70Dfd6110Cab7"; // wETH
        const oracle = "0x1552Ba15bB32e0FEfb69541C9074E8291E7761b8"
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
      
        console.log('initialising chamber...');
        const initCauldron = chamberFlat.attach(chamberFlat.address);
        await (await initCauldron.init(initData)).wait();
        console.log('initialised chamber');
        console.log('deploying clone...');
        const tx = await (await BentoBox.deploy(chamberFlatMasterContract, initData, true)).wait();
      
        const deployEvent = tx?.events?.[0];
        console.log('Clone contract Successfully Deployed: ', deployEvent.args.cloneAddress);
        const cloneAddress = deployEvent.args.cloneAddress;
        await senUSD.mintToBentoBox(cloneAddress, parseUnits('100000', 18), BentoBox.address);

        const marketLens = await hre.ethers.getContractAt("MarketLens", '0xebB397119fb6FF976fD6034F3dC7cD43a47C966E');

        return {
           owner, addr1, addr2, addr3, BentoBox, chamberFlatMasterContract, senUSD, chamber, collateral, cloneAddress, mock, marketLens 
        };
  }

    describe('SUCCESS SCENARIOS', () => {
        it('it should connect to every contract', async () => {
           const { chamber , BentoBox, mock, marketLens } = await loadFixture(
                deployTestingFixture,
            );
            expect(BentoBox.address).to.not.equal(0);
            expect(chamber.address).to.not.equal(0);
            expect(mock.address).to.not.equal(0);
            expect(marketLens.address).to.not.equal(0);
        });

        it('should borrow 100 on 0.5 % open interest, position must have interest applied ', async () => {
            const { addr1, cloneAddress, BentoBox, mock, chamberFlatMasterContract, marketLens, senUSD } = await loadFixture(deployTestingFixture);
        
            const nonce = await BentoBox.nonces(addr1.address);
        
            const domainData = {
                name: 'BentoBox V1',
                chainId: 31337,
                verifyingContract: BentoBox.address
            };
        
            const messageData = {
                warning: 'Give FULL access to funds in (and approved to) BentoBox?',
                user: addr1.address,
                masterContract: chamberFlatMasterContract,
                approved: true,
                nonce
            };
        
            const { v, r, s } = await generateSignature(addr1, domainData, messageData);
        
            let cookData = { events: [], values: [], datas: [] };

            const chamberFlatClone = await ethers.getContractAt("ChamberFlat", cloneAddress)
            await mock.mint(addr1.address, parseUnits('10', 18));

            await mock.connect(addr1).approve(BentoBox.address, parseUnits('10000', 18));

            cookData = actions.bentoSetApproval(cookData, addr1.address, chamberFlatMasterContract, true, v, r, s);
          
            cookData = actions.updateExchangeRate(cookData, true, 0x00, 0x00);
        
            cookData = actions.bentoDeposit(cookData, mock.address, addr1.address, parseUnits('1', 18), parseUnits('1', 18));
        
            cookData = actions.addCollateral(cookData, parseUnits('1', 18,), addr1.address, false);
            
            cookData = actions.borrow(
                cookData,
                parseUnits('100', 18),
                addr1.address
              );
    
            cookData = actions.bentoWithdraw(
                cookData,
                senUSD.address,
                addr1.address,
                parseUnits('100', 18),
                parseUnits('100', 18),
                0
              );
            
            await chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas);
            const userPosition = await marketLens.getUserPosition(cloneAddress, addr1.address);
            expect(userPosition.borrowValue).to.equal(BigNumber.from(parseUnits('100.5', 18)));
            expect(await senUSD.balanceOf(addr1.address)).to.equal(parseUnits('100', 18));

        });

        it('should borrow 100 on 3.5 % open interest, position must have interest applied ', async () => {
          const { addr1, cloneAddress, BentoBox, mock, chamberFlatMasterContract, marketLens, senUSD } = await loadFixture(deploySecondFixture);
      
          const nonce = await BentoBox.nonces(addr1.address);
      
          const domainData = {
              name: 'BentoBox V1',
              chainId: 31337,
              verifyingContract: BentoBox.address
          };
      
          const messageData = {
              warning: 'Give FULL access to funds in (and approved to) BentoBox?',
              user: addr1.address,
              masterContract: chamberFlatMasterContract,
              approved: true,
              nonce
          };
      
          const { v, r, s } = await generateSignature(addr1, domainData, messageData);
      
          let cookData = { events: [], values: [], datas: [] };

          const chamberFlatClone = await ethers.getContractAt("ChamberFlat", cloneAddress)
          await mock.mint(addr1.address, parseUnits('10', 18));

          await mock.connect(addr1).approve(BentoBox.address, parseUnits('10000', 18));

          cookData = actions.bentoSetApproval(cookData, addr1.address, chamberFlatMasterContract, true, v, r, s);
        
          cookData = actions.updateExchangeRate(cookData, true, 0x00, 0x00);
      
          cookData = actions.bentoDeposit(cookData, mock.address, addr1.address, parseUnits('1', 18), parseUnits('1', 18));
      
          cookData = actions.addCollateral(cookData, parseUnits('1', 18,), addr1.address, false);
          
          cookData = actions.borrow(
              cookData,
              parseUnits('100', 18),
              addr1.address
            );
  
          cookData = actions.bentoWithdraw(
              cookData,
              senUSD.address,
              addr1.address,
              parseUnits('100', 18),
              parseUnits('100', 18),
              0
            );
          
          await chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas);
          const userPosition = await marketLens.getUserPosition(cloneAddress, addr1.address);
          expect(userPosition.borrowValue).to.equal(BigNumber.from(parseUnits('103.5', 18)));
          expect(await senUSD.balanceOf(addr1.address)).to.equal(parseUnits('100', 18));

      });

      it('should borrow 100 on 10 % open interest, position must have interest applied ', async () => {
        const { addr1, cloneAddress, BentoBox, mock, chamberFlatMasterContract, marketLens, senUSD } = await loadFixture(deployThirdFixture);
    
        const nonce = await BentoBox.nonces(addr1.address);
    
        const domainData = {
            name: 'BentoBox V1',
            chainId: 31337,
            verifyingContract: BentoBox.address
        };
    
        const messageData = {
            warning: 'Give FULL access to funds in (and approved to) BentoBox?',
            user: addr1.address,
            masterContract: chamberFlatMasterContract,
            approved: true,
            nonce
        };
    
        const { v, r, s } = await generateSignature(addr1, domainData, messageData);
    
        let cookData = { events: [], values: [], datas: [] };

        const chamberFlatClone = await ethers.getContractAt("ChamberFlat", cloneAddress)
        await mock.mint(addr1.address, parseUnits('10', 18));

        await mock.connect(addr1).approve(BentoBox.address, parseUnits('10000', 18));

        cookData = actions.bentoSetApproval(cookData, addr1.address, chamberFlatMasterContract, true, v, r, s);
      
        cookData = actions.updateExchangeRate(cookData, true, 0x00, 0x00);
    
        cookData = actions.bentoDeposit(cookData, mock.address, addr1.address, parseUnits('1', 18), parseUnits('1', 18));
    
        cookData = actions.addCollateral(cookData, parseUnits('1', 18,), addr1.address, false);
        
        cookData = actions.borrow(
            cookData,
            parseUnits('100', 18),
            addr1.address
          );

        cookData = actions.bentoWithdraw(
            cookData,
            senUSD.address,
            addr1.address,
            parseUnits('100', 18),
            parseUnits('100', 18),
            0
          );
        
        await chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas);
        const userPosition = await marketLens.getUserPosition(cloneAddress, addr1.address);
        expect(userPosition.borrowValue).to.equal(BigNumber.from(parseUnits('110', 18)));
        expect(await senUSD.balanceOf(addr1.address)).to.equal(parseUnits('100', 18));

    });

    it('should accrue interest over 10 days when borrowing 100 senUSD', async () => {
      const { addr1, cloneAddress, BentoBox, mock, chamberFlatMasterContract, marketLens, senUSD } = await loadFixture(deployFiveApyFixture);
  
      const nonce = await BentoBox.nonces(addr1.address);
  
      const domainData = {
          name: 'BentoBox V1',
          chainId: 31337,
          verifyingContract: BentoBox.address
      };
  
      const messageData = {
          warning: 'Give FULL access to funds in (and approved to) BentoBox?',
          user: addr1.address,
          masterContract: chamberFlatMasterContract,
          approved: true,
          nonce
      };
  
      const { v, r, s } = await generateSignature(addr1, domainData, messageData);
  
      let cookData = { events: [], values: [], datas: [] };

      const chamberFlatClone = await ethers.getContractAt("ChamberFlat", cloneAddress)
      await mock.mint(addr1.address, parseUnits('10', 18));

      await mock.connect(addr1).approve(BentoBox.address, parseUnits('10000', 18));

      cookData = actions.bentoSetApproval(cookData, addr1.address, chamberFlatMasterContract, true, v, r, s);
    
      cookData = actions.updateExchangeRate(cookData, true, 0x00, 0x00);
  
      cookData = actions.bentoDeposit(cookData, mock.address, addr1.address, parseUnits('1', 18), parseUnits('1', 18));
  
      cookData = actions.addCollateral(cookData, parseUnits('1', 18,), addr1.address, false);
      
      cookData = actions.borrow(
          cookData,
          parseUnits('100', 18),
          addr1.address
        );

      cookData = actions.bentoWithdraw(
          cookData,
          senUSD.address,
          addr1.address,
          parseUnits('100', 18),
          parseUnits('100', 18),
          0
        );
      
      await chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas);
      await network.provider.send("evm_increaseTime", [864000]);
      await chamberFlatClone.accrue();
      const userPosition = await marketLens.getUserPosition(cloneAddress, addr1.address);
      expect(userPosition.borrowValue).to.equal(parseUnits('100.136892697736439000', 18));
      expect(await senUSD.balanceOf(addr1.address)).to.equal(parseUnits('100', 18));

  });
  it('should accrue interest over 6 months when borrowing 1000 senUSD', async () => {
    const { addr1, cloneAddress, BentoBox, mock, chamberFlatMasterContract, marketLens, senUSD } = await loadFixture(deployTenApyFixture);

    const nonce = await BentoBox.nonces(addr1.address);

    const domainData = {
        name: 'BentoBox V1',
        chainId: 31337,
        verifyingContract: BentoBox.address
    };

    const messageData = {
        warning: 'Give FULL access to funds in (and approved to) BentoBox?',
        user: addr1.address,
        masterContract: chamberFlatMasterContract,
        approved: true,
        nonce
    };

    const { v, r, s } = await generateSignature(addr1, domainData, messageData);

    let cookData = { events: [], values: [], datas: [] };

    const chamberFlatClone = await ethers.getContractAt("ChamberFlat", cloneAddress)
    await mock.mint(addr1.address, parseUnits('10', 18));

    await mock.connect(addr1).approve(BentoBox.address, parseUnits('10000', 18));


    cookData = actions.bentoSetApproval(cookData, addr1.address, chamberFlatMasterContract, true, v, r, s);
  
    cookData = actions.updateExchangeRate(cookData, true, 0x00, 0x00);

    cookData = actions.bentoDeposit(cookData, mock.address, addr1.address, parseUnits('1', 18), parseUnits('1', 18));

    cookData = actions.addCollateral(cookData, parseUnits('1', 18,), addr1.address, false);
    
    cookData = actions.borrow(
        cookData,
        parseUnits('1000', 18),
        addr1.address
      );

    cookData = actions.bentoWithdraw(
        cookData,
        senUSD.address,
        addr1.address,
        parseUnits('1000', 18),
        parseUnits('1000', 18),
        0
      );
    
    await chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas);
    await network.provider.send("evm_increaseTime", [15780000]);
    await chamberFlatClone.accrue();
    await senUSD.connect(addr1).approve(BentoBox.address, parseUnits('10000', 18));
    const userPosition = await marketLens.getUserPosition(cloneAddress, addr1.address);
    //expect(userPosition.borrowValue).to.equal(parseUnits('100.136892697736439000', 18));
    expect(await senUSD.balanceOf(addr1.address)).to.equal(parseUnits('1000', 18));

    cookData = { events: [], values: [], datas: [] };

    cookData = actions.updateExchangeRate(cookData, true, 0x00, 0x00);

    cookData = actions.bentoDeposit(
      cookData,
      senUSD.address,
      addr1.address,
      parseUnits('1000', 18),
      parseUnits('0', 18)
    );

    cookData = actions.getRepayPart(
      cookData,
      BigNumber.from(parseUnits('1000', 18))
    );
    const USE_VALUE1 = -1;
    cookData = actions.repay(
      cookData,
      USE_VALUE1,
      addr1.address,
      false
    );
    await chamberFlatClone.accrue();
    await chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas);
    const userPositionAfter = await marketLens.getUserPosition(cloneAddress, addr1.address);
    expect(userPositionAfter.borrowValue).to.equal(parseUnits('50.003812545963830032', 18));
    expect(await senUSD.balanceOf(addr1.address)).to.equal(parseUnits('0', 18));


  });
  });
});
