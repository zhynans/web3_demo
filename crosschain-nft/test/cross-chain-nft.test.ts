import { ethers } from 'hardhat';
import { expect } from 'chai';
import { deployments } from 'hardhat';

import {
  MyToken,
  CCIPLocalSimulator,
  NFTPoolLockAndRelease,
  WrappedMyToken,
  NFTPoolBurnAndMint,
} from '../typechain-types';

describe('test crosschain contract', function () {
  let ccipSimulator: CCIPLocalSimulator;
  let nft: MyToken;
  let nftPoolLockAndRelease: NFTPoolLockAndRelease;
  let wnft: WrappedMyToken;
  let wnftPoolBurnAndMint: NFTPoolBurnAndMint;
  let accountAddr1: string;
  let chainSelector: bigint;

  before(async () => {
    await deployments.fixture(['all']);

    const [account1] = await ethers.getSigners();
    accountAddr1 = account1.address;

    ccipSimulator = await ethers.getContractAt(
      'CCIPLocalSimulator',
      (await deployments.get('CCIPLocalSimulator')).address
    );
    chainSelector = (await ccipSimulator.configuration()).chainSelector_;

    nft = await ethers.getContractAt(
      'MyToken',
      (await deployments.get('MyToken')).address
    );
    nftPoolLockAndRelease = await ethers.getContractAt(
      'NFTPoolLockAndRelease',
      (await deployments.get('NFTPoolLockAndRelease')).address
    );
    wnft = await ethers.getContractAt(
      'WrappedMyToken',
      (await deployments.get('WrappedMyToken')).address
    );
    wnftPoolBurnAndMint = await ethers.getContractAt(
      'NFTPoolBurnAndMint',
      (await deployments.get('NFTPoolBurnAndMint')).address
    );
  });

  // source chain -> dest chain
  describe('source chain -> dest chain', async () => {
    // test if user can mint a nft from nft contract successfully
    it('test if user can mint a nft from nft contract successfully', async () => {
      await nft.safeMint(accountAddr1);
      const owner = await nft.ownerOf(0);

      expect(owner).to.equal(accountAddr1);
    });

    // test if user can lock the nft in the pool on source chain
    it('test if user can lock the nft in the pool on source chain', async () => {
      await ccipSimulator.requestLinkFromFaucet(
        nftPoolLockAndRelease.target,
        ethers.parseEther('10')
      );

      await nft.approve(nftPoolLockAndRelease.target, 0);
      // uint256 tokenId, address newOwner, uint64 chainSelector, address receiver
      await nftPoolLockAndRelease.lockAndSendNFT(
        0,
        accountAddr1,
        chainSelector,
        wnftPoolBurnAndMint.target
      );

      const owner = await nft.ownerOf(0);
      expect(owner).to.equal(nftPoolLockAndRelease.target);
    });

    // test if user can get a wrapped nft in dest chain
    it('test if user can get a wrapped nft in dest chain', async () => {
      const newOwner = await wnft.ownerOf(0);
      expect(newOwner).to.equal(accountAddr1);
    });
  });

  // dest chain -> source chain
  describe('dest chain -> source chain', async () => {
    // test if user can burn a wnft and send ccip message on dest chain
    it('wnft can be burned', async function () {
      // fund some Link tokens
      ccipSimulator.requestLinkFromFaucet(
        wnftPoolBurnAndMint.target,
        ethers.parseEther('10')
      );

      // grant permission
      await wnft.approve(wnftPoolBurnAndMint.target, 0);

      // transfer the token
      await wnftPoolBurnAndMint.burnAndSendNFT(
        0,
        accountAddr1,
        chainSelector,
        nftPoolLockAndRelease.target
      );
      const wnftTotalSupply = await wnft.totalSupply();
      expect(wnftTotalSupply).to.equal(0);
    });

    // test if user have the nft unlocked on source chain
    it('owner of the NFT is transferred to firstAccount', async function () {
      const newOwner = await nft.ownerOf(0);
      expect(newOwner).to.equal(accountAddr1);
    });
  });
});
