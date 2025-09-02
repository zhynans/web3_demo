import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { developmentChains } from '../hardhat.config.helper';
import {  network } from 'hardhat';


const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { account1 } = await getNamedAccounts();

  // check if the network is a development chain
  if (!developmentChains.includes(network.name)) {
    log('development environment detected, skipping deployment');
    return;
  }

  log('Deploying CCIP Simulator contract');

  // 部署 MyToken 合约
  await deploy('CCIPLocalSimulator', {
    from: account1,
    args: [], // 构造函数参数
    log: true, // 输出部署日志
  });

  log('CCIP Simulator contract deployed successfully');
};

func.tags = ['test', 'all']; // 为脚本添加标签，便于选择性执行
export default func;
