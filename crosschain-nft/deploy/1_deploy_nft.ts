import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { account1 } = await getNamedAccounts();

  log('Deploying nft contract');

  // 部署 MyToken 合约
  await deploy('MyToken', {
    from: account1,
    args: ['MyToken', 'MT'], // 构造函数参数
    log: true, // 输出部署日志
  });

  log('nft contract deployed successfully');
};

func.tags = ['sourcechain', 'all']; // 为脚本添加标签，便于选择性执行
export default func;
