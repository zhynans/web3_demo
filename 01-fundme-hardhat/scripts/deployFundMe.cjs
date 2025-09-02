// import ethers.js

// 如果你的项目主要使用 CommonJS 模块，可以将相关文件改为 .cjs 扩展名。
// 如果文件是.js扩展名，和 package.json中的 "type": "module"配置冲突。
const { ethers } = require("hardhat");
require("@nomicfoundation/hardhat-verify");

async function main() {
  const fundMeFactory = await ethers.getContractFactory("FundMe");
  console.log("contract deploying");

  // // 部署合约
  const fundMe = await fundMeFactory.deploy(10 * 60); // 单位：秒
  await fundMe.waitForDeployment();

  console.log(
    `contract has been deployed successfully, contract address is ${fundMe.target}`
  );

  // sepolia测试网络
  if (hre.network.config.chainId == 11155111 && process.env.ETHERSCAN_API_KEY) {
    // 等待5个区块时间，不然会报错
    console.log("Waiting for 5 confirmations");
    await fundMe.deploymentTransaction().wait(5);
    // 验证合约
    verifyFundMe(fundMe.target, [10 * 60]);
  } else {
    console.log("verification skipped");
  }

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
}

async function verifyFundMe(fundMeAddr, args) {
  await hre.run("verify:verify", {
    address: fundMeAddr,
    constructorArguments: args,
  });
}

main()
  .then()
  .catch((error) => {
    console.error(error);
  });
