const { task } = require("hardhat/config");

task("deploy-fundme", "Deploy the FundMe contract").setAction(
  async (taskArgs, hre) => {
    const fundMeFactory = await ethers.getContractFactory("FundMe");
    console.log("contract deploying");

    // // 部署合约
    const fundMe = await fundMeFactory.deploy(10 * 60); // 单位：秒
    await fundMe.waitForDeployment();

    console.log(
      `contract has been deployed successfully, contract address is ${fundMe.target}`
    );

    // sepolia测试网络
    if (
      hre.network.config.chainId == 11155111 &&
      process.env.ETHERSCAN_API_KEY
    ) {
      // 等待5个区块时间，不然会报错
      console.log("Waiting for 5 confirmations");
      await fundMe.deploymentTransaction().wait(5);
      // 验证合约
      verifyFundMe(fundMe.target, [10 * 60]);
    } else {
      console.log("verification skipped");
    }
  }
);

async function verifyFundMe(fundMeAddr, args) {
  await hre.run("verify:verify", {
    address: fundMeAddr,
    constructorArguments: args,
  });
}

module.exports = {};
