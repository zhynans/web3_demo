import { task } from 'hardhat/config';

export const mintNft = task('mint-nft', 'Mint an NFT').setAction(
  async (taskArgs, hre) => {
    const { deployments, ethers } = hre;
    const [deployer] = await ethers.getSigners();
    const nft = await ethers.getContractAt(
      'MyToken',
      (await deployments.get('MyToken')).address
    );
    const tx = await nft.safeMint(deployer.address);
    await tx.wait(5);
    console.log('NFT minted');
  }
);
