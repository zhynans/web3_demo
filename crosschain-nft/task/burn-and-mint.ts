import { task } from 'hardhat/config';
import { networkConfig } from '../hardhat.config.helper';

export const burnAndMint = task('burn-and-mint', 'Burn and mint')
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
      const nftPoolLockAndReleaseDm = await companionNetworks[
        'destChain'
      ].deployments.get('NFTPoolLockAndRelease');
      receiver = nftPoolLockAndReleaseDm.address;
    }

    console.log(
      `chainSelector: ${chainSelector}, receiver: ${receiver}, tokenId: ${tokenId}`
    );

    const linkAddr = networkConfig[chainId].link;
    const linkToken = await ethers.getContractAt('LinkToken', linkAddr);

    const wnftPoolBurnAndMint = await ethers.getContractAt(
      'NFTPoolBurnAndMint',
      (await deployments.get('NFTPoolBurnAndMint')).address
    );

    // faucet
    const transferTx = await linkToken.transfer(
      wnftPoolBurnAndMint.target,
      ethers.parseEther('10')
    );
    await transferTx.wait(5);

    console.log(
      `balance of pool is ${await linkToken.balanceOf(wnftPoolBurnAndMint.target)}`
    );

    // WNFT contract
    const nft = await ethers.getContractAt(
      'WrappedMyToken',
      (await deployments.get('WrappedMyToken')).address
    );

    // approve pool address to transfer NFT
    const approveTx = await nft.approve(wnftPoolBurnAndMint.target, tokenId);
    await approveTx.wait(5);

    // call burnAndMint
    // tokenId, newOwner, chainSelector, receiver
    const burnTx = await wnftPoolBurnAndMint.burnAndSendNFT(
      tokenId,
      deployer.address,
      chainSelector,
      receiver
    );
    await burnTx.wait(5);

    console.log(`ccip transaction is sent, the tx hash is ${burnTx.hash}`);
  });
