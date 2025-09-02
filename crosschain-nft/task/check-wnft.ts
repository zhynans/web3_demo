import { task } from 'hardhat/config';

export const checkWnft = task(
  'check-wnft',
  'Check the NFT of the account'
).setAction(async (taskArgs, hre) => {
  const { deployments } = hre;
  const wnft = await hre.ethers.getContractAt(
    'WrappedMyToken',
    (await deployments.get('WrappedMyToken')).address
  );

  console.log('checking status of WrappedMyToken');
  const totalSupply = await wnft.totalSupply();
  console.log('Total supply:', totalSupply);
  for (let tokenId = 0; tokenId < totalSupply; tokenId++) {
    const owner = await wnft.ownerOf(tokenId);
    console.log('Token ID:', tokenId, 'Owner:', owner);
  }
});
