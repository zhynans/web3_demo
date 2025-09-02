import { task } from 'hardhat/config';

export const checkNft = task(
  'check-nft',
  'Check the NFT of the account'
).setAction(async (taskArgs, hre) => {
  const { deployments } = hre;
  const nft = await hre.ethers.getContractAt(
    'MyToken',
    (await deployments.get('MyToken')).address
  );

  console.log('checking status of MyToken');
  const totalSupply = await nft.totalSupply();
  console.log('Total supply:', totalSupply);
  for (let tokenId = 0; tokenId < totalSupply; tokenId++) {
    const owner = await nft.ownerOf(tokenId);
    console.log('Token ID:', tokenId, 'Owner:', owner);
  }
});
