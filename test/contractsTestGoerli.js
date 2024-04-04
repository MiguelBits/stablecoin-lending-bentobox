'use strict';

const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { increaseTo } = require('@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time');

const { expect } = require('chai');
const { parse } = require('dotenv');
const { BigNumber } = require('ethers');
const { ethers, hardhatArguments } = require('hardhat');
const { actions } = require('./helpers/signAndParse');
const { generateSignature } = require('./helpers/generateSignature');
const { parseUnits } = require('ethers/lib/utils');
// eslint-disable-next-line max-lines-per-function
describe('Seneca Contract', () => {

    async function deployTestingFixture() {
        const [owner, addr1, addr2, addr3] = await ethers.getSigners();
        // const bento = await hre.ethers.getContractFactory("BentoBoxV1");
        // console.log('bentobox deploying...')
        // const bentobox = await bento.deploy("0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6");
        
        // await bentobox.deployed();
        
      
        const chamberFlat = await hre.ethers.getContractFactory("ChamberFlat");
        const chamber = chamberFlat.attach('0xF804ba54FC4a533991a825BA4ff0165FE39b51A0');
        const senUsd = await hre.ethers.getContractAt("SenecaUSD", '0x649eEDEF5729c0581cB9DdA2d01770D7BDbDcF06');
        
        //console.log('senUSD deploying...')
        //const senUSD = await senUsd.deploy();
        // await senUSD.deployed();
        //console.log('chamber deploying...')
        const bentoBox = await ethers.getContractAt("BentoBoxV1", '0x6Aa8986080085791e9872432b8603C2198d7aA18');
        const BentoBox = bentoBox.attach('0x6Aa8986080085791e9872432b8603C2198d7aA18');

        // const chamberFlat = await chamber.deploy(bentobox.address, senUSD.address);
        // await chamberFlat.deployed();
      
        /*console.log(
          `BentoBox Successfully Deployed`, BentoBox.address
        );
      
        console.log(
          `Chamber Contract Successfully Deployed`, chamber.address
        );
      
        console.log(
          `SenUSD Contract Successfully Deployed`, senUSD.address
        );*/
      
        const mocketh = await hre.ethers.getContractAt("ERC20Mock", '0x7A51f19c68181759D4827cB623D70Dfd6110Cab7');
        const mock = await mocketh.attach('0x7A51f19c68181759D4827cB623D70Dfd6110Cab7');
        // const MockERC20 = await mock.deploy('Wrapped Eth','WETH', owner.address, 1000000000000000);
        // await MockERC20.deployed();

        const chamberFlatMasterContract = '0xbfbD65F38f97dBcD647c8B32290a9C55D5518a84'; // chamberFlat
      
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
      
        //console.log('initialising chamber...');
        // const initCauldron = chamber.attach(chamber.address);
        // await (await initCauldron.init(initData)).wait();
        //console.log('initialised chamber');
        //console.log('deploying clone...');
        // const tx = await (await BentoBox.deploy(chamberFlatMasterContract, initData, true)).wait();
      
        // const deployEvent = tx?.events?.[0];
        // console.log('Clone contract Successfully Deployed: ', deployEvent.args.cloneAddress);
        const cloneAddress = '0xF804ba54FC4a533991a825BA4ff0165FE39b51A0';
      
        //console.log('deploying Market Lens...')
        const marketLens = await hre.ethers.getContractAt("MarketLens", '0xebB397119fb6FF976fD6034F3dC7cD43a47C966E');
        //const MarketLensV2 = await marketLens.deploy();
        
        //await MarketLensV2.deployed();
        // console.log('Market Lens Successfully Deployed: ', MarketLensV2.address);


      
        //console.log('Registry Successfully Deployed: ', RegistryContract.address);

        return {
           owner, addr1, addr2, addr3, BentoBox, chamberFlatMasterContract, senUsd, chamber, collateral, cloneAddress, mock, marketLens 
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

        it('should successfully execute cook with parsed signature', async () => {
            const { addr1, cloneAddress, BentoBox, mock, chamberFlatMasterContract } = await loadFixture(deployTestingFixture);
        
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
            
            await chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas);
        });
        it('should successfully execute a deposit cook with signature', async () => {
            const { addr1, cloneAddress, BentoBox, mock, chamberFlatMasterContract, marketLens } = await loadFixture(deployTestingFixture);
        
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
            const balance = await mock.balanceOf(addr1.address);
            await mock.connect(addr1).approve(BentoBox.address, parseUnits('10000', 18));
        
            cookData = actions.bentoSetApproval(cookData, addr1.address, chamberFlatMasterContract, true, v, r, s);
            
            cookData = actions.updateExchangeRate(cookData, true, 0x00, 0x00);
            
            cookData = actions.bentoDeposit(cookData, mock.address, addr1.address, parseUnits('1', 18), parseUnits('1', 18));

            cookData = actions.addCollateral(cookData, parseUnits('1', 18,), addr1.address, false);
            
            await chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas);
            const userPosition = await marketLens.getUserPosition(cloneAddress, addr1.address);
            expect(userPosition.collateral.amount).to.equal(BigNumber.from(parseUnits('1', 18)));

        });

        it('should successfully execute borrow 100 senUSD against deposited collateral', async () => {
            const { addr1, cloneAddress, BentoBox, mock, chamberFlatMasterContract, marketLens, senUsd } = await loadFixture(deployTestingFixture);
        
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
                senUsd.address,
                addr1.address,
                parseUnits('100', 18),
                parseUnits('100', 18),
                0
              );
            
            await chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas);
            const userPosition = await marketLens.getUserPosition(cloneAddress, addr1.address);
            expect(userPosition.borrowValue).to.equal(BigNumber.from(parseUnits('100.5', 18)));
            expect(await senUsd.balanceOf(addr1.address)).to.equal(parseUnits('100', 18));

        });

        
        it('should successfully repay 100 senUSD collateral', async () => {
          const { addr1, cloneAddress, BentoBox, mock, chamberFlatMasterContract, marketLens, senUsd } = await loadFixture(deployTestingFixture);
      
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
          await mock.connect(addr1).approve(cloneAddress, parseUnits('10000', 18));
          await mock.connect(addr1).approve(chamberFlatMasterContract, parseUnits('10000', 18));
          await senUsd.connect(addr1).approve(BentoBox.address, parseUnits('10000', 18));
          await senUsd.connect(addr1).approve(cloneAddress, parseUnits('10000', 18));
          await senUsd.connect(addr1).approve(chamberFlatMasterContract, parseUnits('10000', 18));

          cookData = actions.bentoSetApproval(cookData, addr1.address, chamberFlatMasterContract, true, v, r, s);
        
          cookData = actions.updateExchangeRate(cookData, true, 0x00, 0x00);

          /* cookData.events.push(8);
          cookData.values.push(0);
          cookData.datas.push(0); */
      
          cookData = actions.bentoDeposit(cookData, mock.address, addr1.address, parseUnits('1', 18), parseUnits('1', 18));
      
          cookData = actions.addCollateral(cookData, parseUnits('1', 18,), addr1.address, false);
          
          actions.borrow(
              cookData,
              parseUnits('100', 18),
              addr1.address
            );
  
          actions.bentoWithdraw(
            cookData,
            senUsd.address,
            addr1.address,
            parseUnits('100', 18),
            parseUnits('100', 18),
            0
          );

          console.log(cookData);
          await chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas);
          expect(await senUsd.balanceOf(addr1.address)).to.equal(parseUnits('100', 18));
          const Borrowvalue = await marketLens.getUserBorrow(chamberFlatClone.address, addr1.address);
          console.log('user borrow amount', BigNumber.from(Borrowvalue));
          cookData = { events: [], values: [], datas: [] };


          cookData = actions.updateExchangeRate(cookData, true, 0x00, 0x00);

          cookData = actions.bentoDeposit(
            cookData,
            senUsd.address,
            addr1.address,
            parseUnits('100', 18),
            parseUnits('0', 18)
          );

          /* cookData.events.push(8);
          cookData.values.push(0);
          cookData.datas.push(0); */

          cookData = actions.getRepayPart(
            cookData,
            BigNumber.from(parseUnits('100', 18))
          );
          const USE_VALUE1 = -1;
          cookData = actions.repay(
            cookData,
            USE_VALUE1,
            addr1.address,
            false
          );
          

          await chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas);
          console.log('balance of SENUSD', await senUsd.balanceOf(addr1.address));
          const value = await marketLens.getUserBorrow(chamberFlatClone.address, addr1.address);
          console.log('user borrow amount', BigNumber.from(value));
          expect(await senUsd.balanceOf(addr1.address)).to.equal(BigNumber.from(0));

      });
      it('should successfully withdraw deposited collateral', async () => {
        const { addr1, cloneAddress, BentoBox, mock, chamberFlatMasterContract, collateral } = await loadFixture(deployTestingFixture);
    
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
        const balance = await mock.balanceOf(addr1.address);

        await mock.connect(addr1).approve(BentoBox.address, parseUnits('10000', 18));

        cookData = actions.bentoSetApproval(cookData, addr1.address, chamberFlatMasterContract, true, v, r, s);
      
        cookData = actions.updateExchangeRate(cookData, true, 0x00, 0x00);
    
        cookData = actions.bentoDeposit(cookData, mock.address, addr1.address, parseUnits('1', 18), parseUnits('1', 18));
    
        cookData = actions.addCollateral(cookData, parseUnits('1', 18), addr1.address, false);
        
        await chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas);

        expect(await mock.balanceOf(addr1.address)).to.equal(parseUnits('9', 18));
        
        cookData = { events: [], values: [], datas: [] };

        cookData = actions.updateExchangeRate(
          cookData,
          false,
          //@ts-ignore hardcoded
          0x00,
          0x00,
          0
        );
  
        cookData = actions.removeCollateral(
          cookData,
          parseUnits('1', 18),
          addr1.address
        );
  
        cookData = actions.bentoWithdraw(
          cookData,
          collateral,
          addr1.address,
          0,
          parseUnits('1', 18)
        );
        await chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas);
        expect(await mock.balanceOf(addr1.address)).to.equal(parseUnits('10', 18));
    });
  });
    
    describe('FAILURE SCENARIOS', () => {
      it('should revert if approval signature is invalid', async () => {
        const { addr1, addr2, cloneAddress, BentoBox, mock, chamberFlatMasterContract } = await loadFixture(deployTestingFixture);
    
        const nonce = await BentoBox.nonces(addr1.address);
    
        const domainData = {
            name: 'BentoBox V1',
            chainId: 31337,
            verifyingContract: BentoBox.address
        };
    
        const messageData = {
            warning: 'Give FULL access to funds in (and approved to) BentoBox?',
            user: addr2.address,
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
        
        await expect(chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas)).to.be.revertedWith('MasterCMgr: Invalid Signature');
    });
    it('should revert if user did not approve bentobox on collateral token', async () => {
      const { addr1, addr2, cloneAddress, BentoBox, mock, chamberFlatMasterContract } = await loadFixture(deployTestingFixture);
  
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
      await mock.connect(addr1).approve(addr2.address, parseUnits('10000', 18));

  
      cookData = actions.bentoSetApproval(cookData, addr1.address, chamberFlatMasterContract, true, v, r, s);
      cookData = actions.updateExchangeRate(cookData, true, 0x00, 0x00); 
      cookData = actions.bentoDeposit(cookData, mock.address, addr1.address, parseUnits('1', 18), parseUnits('1', 18));
      cookData = actions.addCollateral(cookData, parseUnits('1', 18,), addr1.address, false);
      
      await expect(chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas)).to.be.revertedWith('BoringERC20: TransferFrom failed');
    });
    it('should fail to borrow due to user insolvency', async () => {
      const { addr1, cloneAddress, BentoBox, mock, chamberFlatMasterContract, marketLens, senUsd } = await loadFixture(deployTestingFixture);
  
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
      
      cookData = actions.borrow(
          cookData,
          parseUnits('100', 18),
          addr1.address
        );

      cookData = actions.bentoWithdraw(
          cookData,
          senUsd.address,
          addr1.address,
          parseUnits('100', 18),
          parseUnits('100', 18),
          0
        );
      
      await expect(chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas)).to.be.revertedWith('Chamber: user insolvent');
    });
    it('should fail to repay due to missing approval', async () => {
      const { addr1, cloneAddress, BentoBox, mock, chamberFlatMasterContract, marketLens, senUsd } = await loadFixture(deployTestingFixture);
  
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
      
      actions.borrow(
          cookData,
          parseUnits('100', 18),
          addr1.address
        );

      actions.bentoWithdraw(
        cookData,
        senUsd.address,
        addr1.address,
        parseUnits('100', 18),
        parseUnits('100', 18),
        0
      );

      await chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas);
      expect(await senUsd.balanceOf(addr1.address)).to.equal(parseUnits('100', 18));
      cookData = { events: [], values: [], datas: [] };

      cookData = actions.updateExchangeRate(cookData, true, 0x00, 0x00);

      cookData = actions.bentoDeposit(
        cookData,
        senUsd.address,
        addr1.address,
        parseUnits('100', 18),
        parseUnits('0', 18)
      );

      cookData = actions.getRepayPart(
        cookData,
        parseUnits('100', 18)
      );

      cookData = actions.repay(
        cookData,
        parseUnits('100', 18),
        addr1.address,
        false
      );
      await expect(chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas)).to.be.revertedWith('BoringERC20: TransferFrom failed');
    });
    it('should fail to deposit wrong collateral token', async () => {
      const { addr1, cloneAddress, BentoBox, mock, chamberFlatMasterContract, marketLens } = await loadFixture(deployTestingFixture);
  
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
      const mocketh = await hre.ethers.getContractFactory("ERC20Mock");
      const mock2 = await mocketh.connect(addr1).deploy('Wrapped Eth','WETH', addr1.address, 1000000000000000);
      await mock2.deployed();
      console.log(await mock2.balanceOf(addr1.address));
      await mock.connect(addr1).approve(BentoBox.address, parseUnits('10000', 18));
      await mock2.connect(addr1).approve(BentoBox.address, parseUnits('10000', 18));
      await mock2.connect(addr1).approve(chamberFlatMasterContract, parseUnits('10000', 18));
      await mock2.connect(addr1).approve(cloneAddress, parseUnits('10000', 18));


      cookData = actions.bentoSetApproval(cookData, addr1.address, chamberFlatMasterContract, true, v, r, s);
      
      cookData = actions.updateExchangeRate(cookData, true, 0x00, 0x00);
      
      cookData = actions.bentoDeposit(cookData, mock2.address, addr1.address, parseUnits('1', 18), parseUnits('1', 18));

      cookData = actions.addCollateral(cookData, parseUnits('1', 18,), addr1.address, false);
      
      await expect(chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas)).to.be.revertedWith('BoringERC20: TransferFrom failed');
  });
  it('should fail to borrow due to too much borrow against ltv', async () => {
    const { addr1, cloneAddress, BentoBox, mock, chamberFlatMasterContract, marketLens, senUsd } = await loadFixture(deployTestingFixture);

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
        parseUnits('10000', 18),
        addr1.address
      );

    cookData = actions.bentoWithdraw(
        cookData,
        senUsd.address,
        addr1.address,
        parseUnits('10000', 18),
        parseUnits('10000', 18),
        0
      );
    
    await expect(chamberFlatClone.connect(addr1).cook(cookData.events, cookData.values, cookData.datas)).to.be.revertedWith('Chamber: user insolvent');

});

  });
});
