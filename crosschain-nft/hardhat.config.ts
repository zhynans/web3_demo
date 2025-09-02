import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'hardhat-deploy';
import * as dotenv from 'dotenv';
dotenv.config();
import './task';

const ACCOUNT_PRIVATE_KEY = process.env.ACCOUNT_PRIVATE_KEY!;
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const AMOY_RPC_URL = process.env.AMOY_RPC_URL;

const config: HardhatUserConfig = {
  solidity: '0.8.28',
  networks: {
    sepolia: {
      chainId: 11155111,
      url: SEPOLIA_RPC_URL,
      accounts: [ACCOUNT_PRIVATE_KEY],
      companionNetworks: {
        destChain: 'amoy',
      },
    },
    amoy: {
      chainId: 80002,
      url: AMOY_RPC_URL,
      accounts: [ACCOUNT_PRIVATE_KEY],
      gas: 3000000, // 限制单笔交易的 gasLimit
      companionNetworks: {
        destChain: 'sepolia',
      },
    },
  },
  namedAccounts: {
    account1: {
      default: 0,
    },
  },
};

export default config;
