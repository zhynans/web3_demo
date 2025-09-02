import { task } from 'hardhat/config';
import { networkConfig } from '../hardhat.config.helper';

export const lockAndCross = task('lock-and-cross', 'Lock and cross')
  .addOptionalParam('chainselector', 'chain selector of dest chain')
  .addOptionalParam('receiver', 'receiver address of dest chain')
  .addParam('tokenid', 'token ID to be crossed chain')
  .setAction(async (taskArgs, hre) => {
    const { deployments, ethers, network, companionNetworks } = hre;
    const [deployer] = await ethers.getSigners();
    const chainId = network.config.chainId!;

    const tokenId = Number(taskArgs.tokenid);
    let chainSelector;
    if (taskArgs.chainselector) {
      chainSelector = Number(taskArgs.chainselector);
    } else {
      chainSelector = networkConfig[chainId].chainSelector;
    }

    let receiver;
    if (taskArgs.receiver) {
      receiver = taskArgs.receiver;
    } else {
      const nftPoolBurnAndMintDm =
        await companionNetworks['destChain'].deployments.get(
          'NFTPoolBurnAndMint'
        );
      receiver = nftPoolBurnAndMintDm.address;
    }

    console.log(
      `chainSelector: ${chainSelector}, receiver: ${receiver}, tokenId: ${tokenId}`
    );

    const linkAddr = networkConfig[chainId].link;
    const linkToken = await ethers.getContractAt('LinkToken', linkAddr);

    const nftPoolLockAndRelease = await ethers.getContractAt(
      'NFTPoolLockAndRelease',
      (await deployments.get('NFTPoolLockAndRelease')).address
    );

    // faucet
    const transferTx = await linkToken.transfer(
      nftPoolLockAndRelease.target,
      ethers.parseEther('10')
    );
    await transferTx.wait(5);

    console.log(
      `balance of pool is ${await linkToken.balanceOf(nftPoolLockAndRelease.target)}`
    );

    // NFT contract
    const nft = await ethers.getContractAt(
      'MyToken',
      (await deployments.get('MyToken')).address
    );

    // approve pool address to transfer NFT
    const approveTx = await nft.approve(nftPoolLockAndRelease.target, tokenId);
    await approveTx.wait(5);

    // call lockAndSendNFT
    // tokenId, newOwner, chainSelector, receiver
    const lockTx = await nftPoolLockAndRelease.lockAndSendNFT(
      tokenId,
      deployer.address,
      chainSelector,
      receiver
    );
    await lockTx.wait(5);

    console.log(`ccip transaction is sent, the tx hash is ${lockTx.hash}`);
  });
