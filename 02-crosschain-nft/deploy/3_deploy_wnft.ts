import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, log } = deployments;
  const { account1 } = await getNamedAccounts();

  log('Deploying wnft contract');

  await deploy('WrappedMyToken', {
    from: account1,
    args: ['WrappedMyToken', 'NFT'], // 构造函数参数
    log: true, // 输出部署日志
  });

  log('wnft contract deployed successfully');
};

func.tags = ['destchain', 'all']; // 为脚本添加标签，便于选择性执行
export default func;
