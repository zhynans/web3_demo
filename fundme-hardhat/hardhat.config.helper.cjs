const developmentChains = ["hardhat", "localhost"];
const networkConfig = {
  11155111: {
    name: "sepolia",
    ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  },
};

const DECIMAL = 8;
const INITIAL_PRICE = 300000000000;
const LOCK_TIME = 1 * 60;
const waitConfirmations = 10; //等待区块时间

module.exports = {
  developmentChains,
  networkConfig,
  DECIMAL,
  INITIAL_PRICE,
  LOCK_TIME,
  waitConfirmations,
};
