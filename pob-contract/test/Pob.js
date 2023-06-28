const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const assert = require("assert");

function delay(ms) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}

describe("PoB Functionality", function () {
  let pob, wit, faucet;
  let payer, payerAccount, prover, cc ;
  let pobDefault, witDefault;

  describe("Transfer WIT Tokens", function() {
    beforeEach( async function () {
      const Pob = await ethers.getContractFactory("Pob");
      const WIT = await ethers.getContractFactory("WIT");
      const Faucet = await ethers.getContractFactory("Faucet");
      [payer, payerAccount] = await ethers.getSigners();
      prover = ethers.Wallet.createRandom().connect(ethers.provider);
      cc = ethers.Wallet.createRandom().connect(ethers.provider);
      wit = await WIT.deploy()
      pob = await Pob.deploy(wit.address);
      faucet = await Faucet.deploy(wit.address);
      await wit.transfer(faucet.address, 100000000000);
    });

    it("Send WIT to Payer", async function() {
      let amount = 100000000;
      var balance = await pob.getBalance(prover.address);
      assert.equal(balance, 0);
      await wit.transfer(prover.address, amount);
      balance = await pob.getBalance(prover.address);
      assert.equal(balance, amount);
    });

    it("Request Token from Faucet", async function() {
      var balance = await pob.getBalance(payerAccount.address);
      assert.equal(balance, 0);
      const faucetPayer = faucet.connect(payerAccount);
      await faucetPayer.requestTokens();
      balance = await pob.getBalance(payerAccount.address);
      assert.equal(balance.toNumber(), 100000000)

      try {
        await faucetPayer.requestTokens();
      } catch(err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: reverted with reason string 'Request Too Frequent'")
      }
    });
  });

  describe("PoB Challenge Correctness", function() {
    beforeEach( async function () {
      [payer, payerAccount] = await ethers.getSigners();
      const Pob = await ethers.getContractFactory("Pob");
      const WIT = await ethers.getContractFactory("WIT");
      prover = ethers.Wallet.createRandom();
      cc = ethers.Wallet.createRandom().connect(ethers.provider);
      witDefault = await WIT.deploy()
      pobDefault = await Pob.deploy(witDefault.address);
      await witDefault.transfer(payerAccount.address, 10000);
    });

    it("Start and End Challenge", async function() {
      let amount = 5000;
      let num_accounts = 2;
      let bandwidth = 50;
      let timeout = 1;
      // Before challenge starts
      const witPayer = witDefault.connect(payerAccount);
      const pobPayer = pobDefault.connect(payerAccount);
      var balancePayer = await pobDefault.getBalance(payerAccount.address);
      var balancePoB = await pobDefault.getBalance(pob.address);
      assert.equal(balancePayer, 10000);
      assert.equal(balancePoB, 0);

      await witPayer.approve(pobDefault.address, amount);

      let info = await pobPayer.startChallenge(
        prover.address,
        payer.address,
        witPayer.address,
        amount,
        bandwidth,
        timeout,
      );
      let receipt = await ethers.provider.getTransactionReceipt(info["hash"]);
      let id;
      for (const log of receipt.logs) {
        try {
          const logDescription = pobPayer.interface.parseLog({
            data: log.data,
            topics: log.topics
          });
          if (logDescription.name === "PobCreated") {
            id = logDescription.args[0]
          }
        } catch(err) {
          continue;
        }
      }

      // After challenge starts
      var balancePayer = await pobDefault.getBalance(payerAccount.address);
      var balancePoB = await pobDefault.getBalance(pobDefault.address);
      assert.equal(balancePayer.toNumber(), 5000, "Payer Balance Mismatch");
      assert.equal(balancePoB.toNumber(), 5000, "Contract Deposit Mismatch");

      let challenger1 = ethers.Wallet.createRandom();
      let challenger2 = ethers.Wallet.createRandom();
      let challengers = [challenger1.address, challenger2.address]
      
      const [payer1, payerAccount1] = await ethers.getSigners();
      console.log(payerAccount1.address)
      console.log(payer.address)
      //const pobCC = pobDefault.connect(payerAccount1);
      await pobDefault.endChallenge(challengers, id);

      // After challenge normally ends
      let balance1 = await pobDefault.getBalance(challenger1.address);
      let balance2 = await pobDefault.getBalance(challenger2.address);
      assert.equal(balance1.toNumber(), 2500, "Challenger1 Balance Mismatch");
      assert.equal(balance2.toNumber(), 2500, "Challenger2 Balance Mismatch");

      var balancePayer = await pobDefault.getBalance(payerAccount.address);
      var balancePoB = await pobDefault.getBalance(pobDefault.address);
      assert.equal(balancePayer.toNumber(), 5000, "Payer Balance Mismatch");
      assert.equal(balancePoB.toNumber(), 0, "Contract Deposit Mismatch");
    });


    it("Start and End Challenge With Ethers", async function() {
      let amount = 0;
      let num_accounts = 2;
      let bandwidth = 50;
      let timeout = 1;
      // Before challenge starts
      const pobPayer = pobDefault.connect(payerAccount);

      let info = await pobPayer.startChallenge(
        prover.address,
        payer.address,
        ethers.constants.AddressZero,
        amount,
        bandwidth,
        timeout,
        { value: 2000 }
      );

      
      let receipt = await ethers.provider.getTransactionReceipt(info["hash"]);
      let id;
      for (const log of receipt.logs) {
        try {
          const logDescription = pobPayer.interface.parseLog({
            data: log.data,
            topics: log.topics
          });
          if (logDescription.name === "PobCreated") {
            id = logDescription.args[0]
          }
        } catch(err) {
          continue;
        }
      }

      let challenger1 = ethers.Wallet.createRandom();
      let challenger2 = ethers.Wallet.createRandom();
      let challengers = [challenger1.address, challenger2.address]
      
      const pobCC = pobDefault.connect(payer);
      await pobCC.endChallenge(challengers, id);

      // After challenge normally ends
      let balance1 = await pobDefault.provider.getBalance(challenger1.address);
      let balance2 = await pobDefault.provider.getBalance(challenger2.address);
      assert.equal(balance1.toNumber(), 1000, "Challenger1 Balance Mismatch");
      assert.equal(balance2.toNumber(), 1000, "Challenger2 Balance Mismatch");
    });


    it("Start and Withdraw Challenge", async function() {
      let amount = 5000;
      let num_accounts = 2;
      let bandwidth = 50;
      let timeout = 1;

      // Before challenge start
      const witPayer = witDefault.connect(payerAccount);
      const pobPayer = pobDefault.connect(payerAccount);
      var balancePayer = await pobDefault.getBalance(payerAccount.address);
      var balancePoB = await pobDefault.getBalance(pob.address);
      assert.equal(balancePayer, 10000);
      assert.equal(balancePoB, 0);

      await witPayer.approve(pobDefault.address, amount);
      let info = await pobPayer.startChallenge(
        prover.address,
        payer.address,
        witPayer.address,
        amount,
        bandwidth,
        timeout,
      );
      let receipt = await ethers.provider.getTransactionReceipt(info["hash"]);
      let id;
      for (const log of receipt.logs) {
        try {
          const logDescription = pobPayer.interface.parseLog({
            data: log.data,
            topics: log.topics
          });
          if (logDescription.name === "PobCreated") {
            id = logDescription.args[0]
          }
        } catch(err) {
          continue;
        }
      }

      // After challenge start
      var balancePayer = await pobDefault.getBalance(payerAccount.address);
      var balancePoB = await pobDefault.getBalance(pobDefault.address);
      assert.equal(balancePayer.toNumber(), 5000, "Payer Balance Mismatch");
      assert.equal(balancePoB.toNumber(), 5000, "Contract Deposit Mismatch");
      
      await pobPayer.withdraw(id)

      // After withdraw
      var balancePayer = await pobDefault.getBalance(payerAccount.address);
      var balancePoB = await pobDefault.getBalance(pobDefault.address);
      assert.equal(balancePayer.toNumber(), 10000, "Payer Balance Mismatch");
      assert.equal(balancePoB.toNumber(), 0, "Contract Deposit Mismatch");
    });

    it("Start and Timeout", async function() {
      let amount = 5000;
      let num_accounts = 2;
      let bandwidth = 50;
      let timeout = 1;

      // Before challenge starts
      const witPayer = witDefault.connect(payerAccount);
      const pobPayer = pobDefault.connect(payerAccount);
      var balancePayer = await pobDefault.getBalance(payerAccount.address);
      var balancePoB = await pobDefault.getBalance(pob.address);
      assert.equal(balancePayer, 10000);
      assert.equal(balancePoB, 0);

      await witPayer.approve(pobDefault.address, 5000);
      let info = await pobPayer.startChallenge(
        prover.address,
        payer.address,
        witPayer.address,
        amount,
        bandwidth,
        timeout,
      );
      let receipt = await ethers.provider.getTransactionReceipt(info["hash"]);
      let id;
      for (const log of receipt.logs) {
        try {
          const logDescription = pobPayer.interface.parseLog({
            data: log.data,
            topics: log.topics
          });
          if (logDescription.name === "PobCreated") {
            id = logDescription.args[0]
          }
        } catch(err) {
          continue;
        }
      }

      // After challenge starts
      var balancePayer = await pobDefault.getBalance(payerAccount.address);
      var balancePoB = await pobDefault.getBalance(pobDefault.address);
      assert.equal(balancePayer.toNumber(), 5000, "Payer Balance Mismatch");
      assert.equal(balancePoB.toNumber(), 5000, "Contract Deposit Mismatch");

      await delay(2000)
      await pobDefault.timeout(id)

      // After timeout
      var balancePayer = await pobDefault.getBalance(payerAccount.address);
      var balancePoB = await pobDefault.getBalance(pobDefault.address);
      assert.equal(balancePayer.toNumber(), 10000, "Payer Balance Mismatch");
      assert.equal(balancePoB.toNumber(), 0, "Contract Deposit Mismatch");
    });

  });


  describe("Erroneous PoB Challenge", function() {
    beforeEach( async function () {
      [payer, payerAccount] = await ethers.getSigners();
      const Pob = await ethers.getContractFactory("Pob");
      const WIT = await ethers.getContractFactory("WIT");
      prover = ethers.Wallet.createRandom();
      cc = ethers.Wallet.createRandom().connect(ethers.provider);
      witDefault = await WIT.deploy()
      pobDefault = await Pob.deploy(witDefault.address);
      await witDefault.transfer(payerAccount.address, 10000);
    });

    it("Insufficient Funds", async function() {
      let amount = 11000;
      let num_accounts = 2;
      let bandwidth = 50;
      let timeout = 1;

      const witPayer = witDefault.connect(payerAccount);
      const pobPayer = pobDefault.connect(payerAccount);
      await witPayer.approve(pobDefault.address, 11000);
      try{
        await pobPayer.startChallenge(
          prover.address,
          cc.address,
          witPayer.address,
          amount,
          bandwidth,
          timeout,
        ); 
      } catch (err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: reverted with reason string 'ERC20: transfer amount exceeds balance'");
      };
    });

    it("Not Enough Allowence", async function() {
      let amount = 5000;
      let num_accounts = 2;
      let bandwidth = 50;
      let timeout = 1;

      const witPayer = witDefault.connect(payerAccount);
      const pobPayer = pobDefault.connect(payerAccount);
      await witPayer.approve(pobDefault.address, 4000);
      try{
        await pobPayer.startChallenge(
          prover.address,
          cc.address,
          witPayer.address,
          amount,
          bandwidth,
          timeout,
        ); 
      } catch (err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: reverted with reason string 'ERC20: insufficient allowance'");
      };
    });

    it("Not Initiator End", async function() {
      let amount = 5000;
      let num_accounts = 2;
      let bandwidth = 50;
      let timeout = 1;

      const witPayer = witDefault.connect(payerAccount);
      const pobPayer = pobDefault.connect(payerAccount);
      await witPayer.approve(pobDefault.address, amount);
      let id = (await pobPayer.startChallenge(
        prover.address,
        cc.address,
        witPayer.address,
        amount,
        bandwidth,
        timeout,
      ))["value"]; 
      let challenger1 = ethers.Wallet.createRandom();
      let challenger2 = ethers.Wallet.createRandom();
      let challengers = [challenger1.address, challenger2.address]
      try{
        await pobDefault.endChallenge(challengers, id);
      } catch (err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: reverted with reason string 'PoB Not Exist'");
      };
    });

    it("End Challenge Ahead", async function() {
      let challenger1 = ethers.Wallet.createRandom();
      let challenger2 = ethers.Wallet.createRandom();
      let challengers = [challenger1.address, challenger2.address]
      try{
        await pobDefault.endChallenge(challengers, 0); 
      } catch (err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: reverted with reason string 'PoB Not Exist'");
      };
    });

    it("Timeout Ahead", async function() {
      let challenger1 = ethers.Wallet.createRandom();
      let challenger2 = ethers.Wallet.createRandom();
      let challengers = [challenger1.address, challenger2.address]
      try{
        await pobDefault.timeout(0); 
      } catch (err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: reverted with reason string 'PoB Not Exist'");
      };
    });

    it("Withdraw Ahead", async function() {
      let challenger1 = ethers.Wallet.createRandom();
      let challenger2 = ethers.Wallet.createRandom();
      let challengers = [challenger1.address, challenger2.address]
      try{
        await pobDefault.withdraw(0); 
      } catch (err) {
        assert.strictEqual(err.message, "VM Exception while processing transaction: reverted with reason string 'PoB Not Exist'");
      };
    });

  })


});
