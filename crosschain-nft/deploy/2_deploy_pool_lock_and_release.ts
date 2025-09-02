import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers,network } from 'hardhat';
import { networkConfig,developmentChains } from '../hardhat.config.helper';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { account1 } = await getNamedAccounts();

  log('Deploying NFTPoolLockAndRelease  contract');

  let sourceChainRouter;
  let linkTokenAddr;

  // CCIPLocalSimulator contract
  if (developmentChains.includes(network.name)) {
    const ccipSimulatorDeployment = await deployments.get('CCIPLocalSimulator');
  const ccipSimulator = await ethers.getContractAt(
    'CCIPLocalSimulator',
    ccipSimulatorDeployment.address
  );
  const ccipConfig = await ccipSimulator.configuration();
   sourceChainRouter = ccipConfig.sourceRouter_;
   linkTokenAddr = ccipConfig.linkToken_;
  } else {
    const chainId = network.config.chainId!; // 断言非 undefined
    sourceChainRouter = networkConfig[chainId].router;
    linkTokenAddr = networkConfig[chainId].link;
  }
  
  // MyToken contract
  const myTokenDeployment = await deployments.get('MyToken');
  const myTokenAddr = myTokenDeployment.address;

  // deploy NFTPoolLockAndRelease contract
  // address _router, address _link, address nftAddr
  await deploy('NFTPoolLockAndRelease', {
    from: account1,
    args: [sourceChainRouter, linkTokenAddr, myTokenAddr], // 构造函数参数
    log: true, // 输出部署日志
  });

  log('NFTPoolLockAndRelease contract deployed successfully');
};

func.tags = ['sourcechain', 'all']; // 为脚本添加标签，便于选择性执行
export default func;
