// function deployFunction() {
//   console.log("deploying fund me");
// }

const { network } = require("hardhat");
const {
  developmentChains,
  networkConfig,
  LOCK_TIME,
  waitConfirmations,
} = require("../hardhat.config.helper.cjs");

// module.exports.default = deployFunction;

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { account1 } = await getNamedAccounts();
  const { deploy } = deployments;

  let dataFeedAddress;
  if (developmentChains.includes(network.name)) {
    // 本地网络
    const mockDataFeed = await deployments.get("MockV3Aggregator");
    dataFeedAddress = mockDataFeed.address;
  } else {
    // sepolia testnet
    dataFeedAddress = networkConfig[network.config.chainId].ethUsdPriceFeed;
  }

  // 部署合约
  const fundMe = await deploy("FundMe", {
    from: account1,
    args: [LOCK_TIME, dataFeedAddress],
    log: true,
    waitConfirmations: waitConfirmations, // 等待指定区块时间
  });

  // sepolia测试网络
  if (hre.network.config.chainId == 11155111 && process.env.ETHERSCAN_API_KEY) {
    // 验证合约
    await hre.run("verify:verify", {
      address: fundMe.address,
      constructorArguments: [LOCK_TIME, dataFeedAddress],
    });
    console.log("fundme verify success");
  } else {
    console.log("verification skipped");
  }
};

module.exports.tags = ["all", "fundme"];
