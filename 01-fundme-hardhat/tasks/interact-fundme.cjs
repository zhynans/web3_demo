const { task } = require("hardhat/config");

task("interact-fundme", "Interact with the FundMe contract")
  .addParam("addr", "The address of the FundMe contract")
  .setAction(async (taskArgs, hre) => {
    const fundMeFactory = await ethers.getContractFactory("FundMe");
    const fundMe = fundMeFactory.attach(taskArgs.addr);

    // 初始化2个账号
    const [account1, account2] = await ethers.getSigners();
    console.log(account1.address, account2.address);

    // 账号1筹款
    const fundTx = await fundMe.fund({ value: ethers.parseEther("0.01") });
    await fundTx.wait();

    // 查看合约余额
    const balanceOfContract = await ethers.provider.getBalance(fundMe.target);
    console.log(`balance of contract: ${balanceOfContract}`);

    // 账号2筹款
    const fundTx2 = await fundMe.connect(account2).fund({
      value: ethers.parseEther("0.02"),
    });
    await fundTx2.wait();

    // 查看合约余额
    const balanceOfContract2 = await ethers.provider.getBalance(fundMe.target);
    console.log(`balance of contract: ${balanceOfContract2}`);

    // 检查合约筹款人的mapping
    const funderToAmount = await fundMe.fundersToAmount(account1.address);
    console.log(`funderToAmount: ${funderToAmount}`);

    // 检查合约筹款人的mapping
    const funderToAmount2 = await fundMe.fundersToAmount(account2.address);
    console.log(`funderToAmount2: ${funderToAmount2}`);
  });

module.exports = {};
