import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, network } from 'hardhat';
import { networkConfig, developmentChains } from '../hardhat.config.helper';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { account1 } = await getNamedAccounts();

  log('Deploying NFTPoolBurnAndMint  contract');

  let destChainRouter;
  let linkTokenAddr;

  // CCIPLocalSimulator contract
  if (developmentChains.includes(network.name)) {
    const ccipSimulatorDeployment = await deployments.get('CCIPLocalSimulator');
    const ccipSimulator = await ethers.getContractAt(
      'CCIPLocalSimulator',
      ccipSimulatorDeployment.address
    );
    const ccipConfig = await ccipSimulator.configuration();
    destChainRouter = ccipConfig.sourceRouter_;
    linkTokenAddr = ccipConfig.linkToken_;
  } else {
    const chainId = network.config.chainId!; // 断言非 undefined
    destChainRouter = networkConfig[chainId].router;
    linkTokenAddr = networkConfig[chainId].link;
  }

  // WrappedMyToken contract
  const wrappedMyTokenTokenDeployment = await deployments.get('WrappedMyToken');
  const wrappedMyTokenAddr = wrappedMyTokenTokenDeployment.address;

  // deploy NFTPoolBurnAndMint contract
  // address _router, address _link, address nftAddr
  await deploy('NFTPoolBurnAndMint', {
    from: account1,
    args: [destChainRouter, linkTokenAddr, wrappedMyTokenAddr], // 构造函数参数
    log: true, // 输出部署日志
  });

  log('NFTPoolBurnAndMint contract deployed successfully');
};

func.tags = ['destchain', 'all']; // 为脚本添加标签，便于选择性执行
export default func;
