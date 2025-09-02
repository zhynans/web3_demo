const { ethers, deployments, getNamedAccounts } = require("hardhat");
const {
  LOCK_TIME,
  developmentChains,
} = require("../../hardhat.config.helper.cjs");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("test fundme contract", async function () {
      // 默认超时间40s，测试网络较慢，增加超时时间
      this.timeout(180000);

      let fundMe;
      let account1;

      beforeEach(async function () {
        // 部署合约脚本
        await deployments.fixture(["fundme", "mock"]);

        // 每个 Signer 就是一个账号（带私钥的钱包），包括：读取账号地址（signer.address）、签名消息 / 交易、作为调用合约的发起者（contract.connect(signer)）
        const signers = await ethers.getSigners();
        account1 = signers[0];

        // 获取FundMe合约实例，确保部署信息存在
        const fundMeDeployment = await deployments.get("FundMe");
        fundMe = await ethers.getContractAt("FundMe", fundMeDeployment.address);
      });

      // test fund and getFund successfully
      it("test fund and getFund successfully", async function () {
        await fundMe.fund({ value: ethers.parseEther("0.001") });

        // 等待锁定期结束
        await new Promise((resolve) =>
          setTimeout(resolve, (LOCK_TIME + 1) * 1000)
        );

        // 保证fund执行成功
        const getFundTx = await fundMe.getFund();
        const getFundReceipt = await getFundTx.wait();

        await expect(getFundReceipt)
          .to.emit(fundMe, "FundWithdrawByOwner")
          .withArgs(ethers.parseEther("0.001"));
      });

      // test fund and refund successfully
      it("test fund and refund successfully", async function () {
        await fundMe.fund({ value: ethers.parseEther("0.00001") });

        // 等待锁定期结束
        await new Promise((resolve) =>
          setTimeout(resolve, (LOCK_TIME + 1) * 1000)
        );

        // 保证fund执行成功
        const refundTx = await fundMe.refund();
        const reFundReceipt = await refundTx.wait();
        console.log(reFundReceipt);

        await expect(reFundReceipt)
          .to.emit(fundMe, "RefundByFunder")
          .withArgs(account1.address, ethers.parseEther("0.00001"));
      });
    });
