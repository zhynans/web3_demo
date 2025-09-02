"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";
import { parseAbi, createPublicClient, createWalletClient, custom } from "viem";
import { sepolia } from "viem/chains";

export default function Page() {
  const [winner, setWinner] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [playerHand, setPlayerHand] = useState<
    { rank: string; suit: string }[]
  >([]);
  const [dealerHand, setDealerHand] = useState<
    { rank: string; suit: string }[]
  >([]);
  const [score, setScore] = useState<number>(0);
  const { address, isConnected } = useAccount(); // the status of the wallet
  const [isSigned, setIsSigned] = useState<boolean>(false); // check if sign in
  const { signMessageAsync } = useSignMessage();

  const [publicClient, setPublicClient] = useState<any>(null);
  const [walletClient, setWalletClient] = useState<any>(null);

  const initGame = async () => {
    const response = await fetch(`/api?address=${address}`, { method: "GET" });
    const data = await response.json();
    setPlayerHand(data.playerHand);
    setDealerHand(data.dealerHand);
    setMessage(data.message);
    setWinner(data.winner);
    setScore(data.score);

    if (typeof window !== "undefined" && window.ethereum) {
      setPublicClient(
        createPublicClient({
          chain: sepolia,
          transport: custom(window.ethereum),
        })
      );
      setWalletClient(
        createWalletClient({
          chain: sepolia,
          transport: custom(window.ethereum),
        })
      );
    } else {
      console.error("wallet not found");
    }
  };

  async function HandleHit() {
    const response = await fetch("/api", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
      },
      method: "POST",
      body: JSON.stringify({ action: "hit", address }),
    });
    const data = await response.json();
    setPlayerHand(data.playerHand);
    setDealerHand(data.dealerHand);
    setMessage(data.message);
    setWinner(data.winner);
    setScore(data.score);
  }
  async function HandleStand() {
    const response = await fetch("/api", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("jwtToken")}`,
      },
      method: "POST",
      body: JSON.stringify({ action: "stand", address }),
    });
    const data = await response.json();
    setPlayerHand(data.playerHand);
    setDealerHand(data.dealerHand);
    setMessage(data.message);
    setWinner(data.winner);
    setScore(data.score);
  }

  async function HandleReset() {
    const response = await fetch(`/api?address=${address}`, { method: "GET" });
    const data = await response.json();
    setPlayerHand(data.playerHand);
    setDealerHand(data.dealerHand);
    setMessage(data.message);
    setWinner(data.winner);
    setScore(data.score);
  }

  // handle login with wallet
  async function handleSign() {
    const message = `welcome to the game black jack at ${new Date().toString()}`;
    const signature = await signMessageAsync({ message });
    const response = await fetch("/api", {
      method: "POST",
      body: JSON.stringify({ action: "auth", address, message, signature }),
    });

    if (response.status == 200) {
      // store the jwt token in the local storage
      const { jwtToken } = await response.json();
      localStorage.setItem("jwtToken", jwtToken);

      setIsSigned(true);
      initGame();
    }
  }

  if (!isSigned) {
    return (
      <div className="flex flex-col gap-2 items-center justify-center h-screen bg-gray-50">
        <ConnectButton />
        <button
          onClick={handleSign}
          className="border-black p-2 rounded-md bg-blue-300"
        >
          Sign with your wallet{" "}
        </button>
      </div>
    );
  }

  async function handleSendTx() {
    const contractAddr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    const contractAbi = parseAbi([process.env.NEXT_PUBLIC_CONTRACT_ABI || ""]);

    // publicClient -> simulate -> writeContract
    await publicClient.simulateContract({
      address: contractAddr,
      abi: contractAbi,
      functionName: "sendRequest",
      args: [[address], address],
      account: address,
    });

    // 不涉及转账，写入合约。如果涉及到转账，需要使用sendTransaction
    const txHash = await walletClient.writeContract({
      to: contractAddr,
      abi: contractAbi,
      functionName: "sendRequest",
      args: [[address], address],
      account: address,
    });
    console.log("txhash:", txHash);
  }

  return (
    <div className="flex flex-col gap-2 items-center justify-center h-screen bg-gray-50">
      <ConnectButton />
      <h1 className="text-3xl font-bold">Welcome to web3 game Black jack</h1>
      <h1 className="text-3xl font-bold bg-blue-300">
        <span>Score: {score} </span>
      </h1>
      <button
        onClick={handleSendTx}
        className="bg-blue-500 text-white p-2 rounded-md"
      >
        Get NFT
      </button>

      <h1 className={`text-2xl font-bold `}>{message}</h1>

      <div className="mt-4">
        <h2>Dealer's Hand</h2>
        <div className="flex flex-row gap-2">
          {dealerHand.map((card, index) => (
            <div
              key={index}
              className="w-32 h-42 border-1 border-black bg-white rounded-md flex flex-col items-center justify-center"
            >
              <p className="self-start p-2 text-lg">{card.rank}</p>
              <p className="self-center p-2 text-3xl">{card.suit}</p>
              <p className="self-end p-2 text-lg">{card.rank}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <h2>Player's Hand</h2>
        <div className="flex flex-row gap-2">
          {playerHand.map((card, index) => (
            <div
              key={index}
              className="w-32 h-42 border-1 border-black bg-white rounded-md flex flex-col items-center justify-center"
            >
              <p className="self-start p-2 text-lg">{card.rank}</p>
              <p className="self-center p-2 text-3xl">{card.suit}</p>
              <p className="self-end p-2 text-lg">{card.rank}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-row gap-2">
        {message === "" ? (
          <>
            <button
              className="bg-blue-500 text-white p-2 rounded-md"
              onClick={HandleHit}
            >
              Hit
            </button>
            <button
              className="bg-blue-500 text-white p-2 rounded-md"
              onClick={HandleStand}
            >
              Stand
            </button>
          </>
        ) : (
          <button
            className="bg-blue-500 text-white p-2 rounded-md"
            onClick={HandleReset}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
