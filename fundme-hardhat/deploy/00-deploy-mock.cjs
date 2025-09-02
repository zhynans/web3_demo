const { network } = require("hardhat");
const {
  DECIMAL,
  INITIAL_PRICE,
  developmentChains,
} = require("../hardhat.config.helper.cjs");

module.exports = async ({ getNamedAccounts, deployments }) => {
  // 非本地网络，不部署mock合约，直接返回
  if (!developmentChains.includes(network.name)) {
    console.log("env is not local network, skipping mock deployment");
    return;
  }

  const { account1 } = await getNamedAccounts();
  const { deploy } = deployments;

  await deploy("MockV3Aggregator", {
    from: account1,
    args: [DECIMAL, INITIAL_PRICE], // chainlink体系，USD的单位都是8位
    log: true,
  });
};

module.exports.tags = ["all", "mock"];
