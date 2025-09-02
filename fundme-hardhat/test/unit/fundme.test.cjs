const { ethers, deployments, getNamedAccounts, network } = require("hardhat");
const { assert, expect } = require("chai");
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const {
  LOCK_TIME,
  developmentChains,
  networkConfig,
} = require("../../hardhat.config.helper.cjs");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("test fundme contract", async function () {
      let fundMe;
      let account1;
      let dataFeedAddr;

      let account2;

      beforeEach(async function () {
        // 部署合约脚本
        await deployments.fixture(["fundme", "mock"]);

        if (developmentChains.includes(network.name)) {
          const mockV3Aggregator = await deployments.get("MockV3Aggregator");
          dataFeedAddr = mockV3Aggregator.address;
        } else {
          dataFeedAddr = networkConfig[network.config.chainId].ethUsdPriceFeed;
        }

        // 每个 Signer 就是一个账号（带私钥的钱包），包括：读取账号地址（signer.address）、签名消息 / 交易、作为调用合约的发起者（contract.connect(signer)）
        const signers = await ethers.getSigners();
        account1 = signers[0];
        account2 = signers[1];

        const fundMeDeployment = await deployments.get("FundMe");
        fundMe = await ethers.getContractAt("FundMe", fundMeDeployment.address);
      });

      // 验证合约拥有者是否是发送者
      it("test if the owner is msg.sender", async function () {
        await fundMe.waitForDeployment();

        const owner = await fundMe.owner(); // owner属性必须是public
        assert.equal(owner, account1.address);
      });

      // 验证预言机的datafeed是否正确赋值
      it("test if the datafeed is assigned correctly", async function () {
        await fundMe.waitForDeployment();

        const dataFeed = await fundMe.dataFeed();
        assert.equal(dataFeed, dataFeedAddr);
      });

      // fund
      it("the fund is closed, value is greater than target, fund failed", async function () {
        // 确保时间窗口关闭
        await helpers.time.increase(LOCK_TIME);
        await helpers.mine();

        await expect(
          fundMe.fund({ value: ethers.parseEther("0.1") })
        ).to.be.revertedWith("the fund is closed");
      });
      it("the fund is open, value is less than min value, fund failed", async function () {
        await expect(
          fundMe.fund({ value: ethers.parseEther("0.00001") })
        ).to.be.revertedWith("too less");
      });
      it("the fund is open, value is greater than target, fund success", async function () {
        await fundMe.fund({ value: ethers.parseEther("0.1") });
        const funderToAmount = await fundMe.fundersToAmount(account1.address);
        assert.equal(funderToAmount, ethers.parseEther("0.1"));
      });

      // getFund
      // onlyowner, windowClose, target reached
      it("not owner, window closed, target reached, getFund failed", async function () {
        // make sure the target is reached
        await fundMe.fund({ value: ethers.parseEther("0.1") });

        // make sure the window is closed
        await helpers.time.increase(LOCK_TIME);
        await helpers.mine();

        await expect(fundMe.connect(account2).getFund()).to.be.revertedWith(
          "this funciotn can only be called  by owner"
        );
      });

      it("window open, target reached, getFund failed", async function () {
        await fundMe.fund({ value: ethers.parseEther("1") });

        await expect(fundMe.getFund()).to.be.revertedWith(
          "the fund is not closed"
        );
      });

      it("window closed, target reached, getFund success", async function () {
        await fundMe.fund({ value: ethers.parseEther("10") });

        // make sure the window is closed
        await helpers.time.increase(LOCK_TIME);
        await helpers.mine();

        // 通过emit event验证getFund是否成功
        await expect(fundMe.getFund())
          .to.emit(fundMe, "FundWithdrawByOwner")
          .withArgs(ethers.parseEther("10"));
      });

      // refund
      // window closed, target not reached, refund has balance
      it("window open, target not reached, funder has balance, refund failed", async function () {
        await fundMe.fund({ value: ethers.parseEther("0.1") });
        await expect(fundMe.refund()).to.be.revertedWith(
          "the fund is not closed"
        );
      });
      it("window closed, target reached, funder has balance, refund failed", async function () {
        await fundMe.fund({ value: ethers.parseEther("10") });

        // make sure the window is closed
        await helpers.time.increase(LOCK_TIME);
        await helpers.mine();

        await expect(fundMe.refund()).to.be.revertedWith("Target is reached");
      });
      it("window closed, target reached, funder has no balance, refund failed", async function () {
        // make sure the window is closed
        await helpers.time.increase(LOCK_TIME);
        await helpers.mine();

        await expect(fundMe.refund()).to.be.revertedWith(
          "there is no fund for you"
        );
      });

      it("window closed, target reached, funder has balance, refund success", async function () {
        await fundMe.fund({ value: ethers.parseEther("1") });

        // make sure the window is closed
        await helpers.time.increase(LOCK_TIME);
        await helpers.mine();

        await expect(fundMe.refund())
          .to.emit(fundMe, "RefundByFunder")
          .withArgs(account1.address, ethers.parseEther("1"));
      });
    });
