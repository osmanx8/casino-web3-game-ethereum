"use client";

import { useEffect, useState } from "react";
import type { NextPage } from "next";
import { Address as AddressType, parseUnits } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ArrowLeftEndOnRectangleIcon, ClockIcon, UsersIcon } from "@heroicons/react/24/outline";
import { SelectModererModal, SelectPlayerModal } from "~~/components/MafiaGame";
import { Address } from "~~/components/scaffold-eth";
import {
  useDeployedContractInfo,
  useScaffoldWatchContractEvent,
  useTargetNetwork,
  useTransactor,
} from "~~/hooks/scaffold-eth";
import scaffoldConfig from "~~/scaffold.config";
import { notification } from "~~/utils/scaffold-eth";

type RefetchLastKilled = () => void;
type RefetchCurrentState = () => void;
type RefetchPlayers = () => void;
type RefetchWinners = () => void;

interface Player {
  playerAddress: AddressType;
  role: number;
  isAlive: boolean;
  hasVoted: boolean;
}

interface VoteResult {
  mostVoted: AddressType;
  highestVotes: number;
  isTie: boolean;
}

const Home: NextPage = () => {
  const [joined, setJoined] = useState(false);
  const [playerAddresses, setPlayerAddresses] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>({
    playerAddress: "",
    role: 0,
    isAlive: true,
    hasVoted: false,
  });

  const { address: connectedAddress } = useAccount();
  const { data: mafiaContract } = useDeployedContractInfo("MafiaGame");
  const { data: hash, writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const writeTxn = useTransactor();
  const { targetNetwork } = useTargetNetwork();

  useScaffoldWatchContractEvent({
    contractName: "MafiaGame",
    eventName: "GameStarted",
    onLogs: logs => {
      logs.map(() => {
        console.log("📡 Game Started!");
        notification.info("📡 Game Started!");
      });
    },
  });

  useScaffoldWatchContractEvent({
    contractName: "MafiaGame",
    eventName: "NightNarration",
    onLogs: logs => {
      logs.map(log => {
        const { victim } = log.args as unknown as { victim: AddressType };
        console.log("📡 NightNarration: Last night a person was killed by the assassins. The person is", { victim });
        notification.info(
          `📡 NightNarration: Last night a person was killed by the assassins. The person is ${victim}`,
        );
      });
    },
  });

  useScaffoldWatchContractEvent({
    contractName: "MafiaGame",
    eventName: "VotingResult",
    onLogs: logs => {
      logs.map(log => {
        const { mostVoted, highestVotes, isTie } = log.args as unknown as VoteResult;
        console.log("📡 VotingResult event", mostVoted, highestVotes, isTie);
      });
    },
  });

  useScaffoldWatchContractEvent({
    contractName: "MafiaGame",
    eventName: "VotingRestarted",
    onLogs: logs => {
      logs.map(() => {
        console.log("📡 Voting restarted due to the vote result is tie!");
        notification.info("📡 Voting restarted due to the vote result is tie!");
      });
    },
  });

  useScaffoldWatchContractEvent({
    contractName: "MafiaGame",
    eventName: "DayNarration",
    onLogs: logs => {
      logs.map(log => {
        const { victim } = log.args as unknown as { victim: AddressType };
        console.log(`📡 DayNarration event: Player ${victim} was killed by community vote.`);
        notification.info(`📡 DayNarration: Player ${victim} was killed by community vote.`);
      });
    },
  });

  useScaffoldWatchContractEvent({
    contractName: "MafiaGame",
    eventName: "GameEnded",
    onLogs: logs => {
      logs.map(log => {
        const { winners } = log.args;
        console.log("📡 GameEnded:", winners);
        notification.info(
          `📡 Game Ended: Player ${winners?.map((winner, i) => (
            <Address key={i} address={winner} disableAddressLink />
          ))} have claimed their winning prize.`,
        );
      });
    },
  });

  const { data: players, refetch: refetchPlayers } = useReadContract({
    address: mafiaContract?.address,
    functionName: "getAllPlayers",
    abi: mafiaContract?.abi,
    chainId: targetNetwork.id,
  }) as { data: Player[]; refetch: RefetchPlayers };

  const { data: winners, refetch: refetchWinners } = useReadContract({
    address: mafiaContract?.address,
    functionName: "getAllWinners",
    abi: mafiaContract?.abi,
    chainId: targetNetwork.id,
  }) as { data: AddressType[]; refetch: RefetchWinners };

  const { data: currentState, refetch: refetchCurrentState } = useReadContract({
    address: mafiaContract?.address,
    functionName: "currentState",
    abi: mafiaContract?.abi,
    chainId: targetNetwork.id,
  }) as { data: number; refetch: RefetchCurrentState };

  const { data: lastKilled, refetch: refetchLastKilled } = useReadContract({
    address: mafiaContract?.address,
    functionName: "lastKilled",
    abi: mafiaContract?.abi,
    chainId: targetNetwork.id,
  }) as { data: AddressType; refetch: RefetchLastKilled };

  const handleJoin = async () => {
    if (writeContractAsync && mafiaContract?.address) {
      try {
        const makeWriteWithParams = () =>
          writeContractAsync({
            address: mafiaContract?.address,
            functionName: "joinGame",
            abi: mafiaContract?.abi,
            value: BigInt(parseUnits(scaffoldConfig.joiningFee.toString(), 18)),
          });
        await writeTxn(makeWriteWithParams);
        setJoined(true);
        refetchState();
      } catch (e: any) {
        console.error("⚡️ ~ file: page.tsx:handleJoin ~ error", e);
      }
    }
  };

  const handleClaimPrize = async () => {
    if (writeContractAsync && mafiaContract?.address) {
      try {
        const makeWriteWithParams = () =>
          writeContractAsync({
            address: mafiaContract?.address,
            functionName: "claimPrize",
            abi: mafiaContract?.abi,
          });
        await writeTxn(makeWriteWithParams);
        refetchState();
      } catch (e: any) {
        console.error("⚡️ ~ file: page.tsx:handleClaimPrize ~ error", e);
      }
    }
  };

  const refetchState = async () => {
    await refetchPlayers();
    await refetchCurrentState();
    await refetchWinners();
  };

  const isAssassin = (_address: AddressType | undefined) => {
    return (
      players.find(player => {
        return player.playerAddress === _address && scaffoldConfig.roles[player.role] === "Assassin";
      }) !== undefined
    );
  };

  useEffect(() => {
    if (players?.length) {
      const addresses = players.map(player => player.playerAddress);
      setPlayerAddresses(addresses);
      addresses.includes(connectedAddress as string) ? setJoined(true) : setJoined(false);
      const connectedPlayer = players.find(player => player.playerAddress === connectedAddress);
      if (connectedPlayer) {
        setCurrentPlayer(connectedPlayer);
      }
    } else {
      setPlayerAddresses([]);
      setJoined(false);
      setCurrentPlayer({
        playerAddress: "",
        role: 0,
        isAlive: true,
        hasVoted: false,
      });
    }
  }, [players, connectedAddress]);

  const availablePlayerAddresses = playerAddresses.filter(address => address !== connectedAddress);
  const availableModeratorAddresses = players
    ? players
        .filter(player => player.isAlive && player.playerAddress !== connectedAddress)
        .map(player => player.playerAddress)
    : [];

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-32">
        <div className="px-5">
          <h1 className="text-center font-fantasy">
            <span className="block text-white text-8xl mb-2">🆆🅴🅻🅲🅾🅼🅴 to</span>
            <span className="block text-white text-9xl font-bold ">
              <span className="text-red-600">𝕸𝖆𝖗𝖛𝖊𝖑</span> 𝕲𝖆𝖒𝖊
            </span>
          </h1>

          {!joined && connectedAddress && currentState === 0 && (
            <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row pt-10">
              <button
                className="h-10 btn btn-primary rounded-full btn-lg bg-base-100 hover:bg-secondary gap-1"
                onClick={handleJoin}
                disabled={isConfirming || isPending}
              >
                {isConfirming || isPending ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <ArrowLeftEndOnRectangleIcon className="h-6 w-6" />
                )}
                JOIN GAME
              </button>
            </div>
          )}

          {joined && currentState === 4 && winners.includes(connectedAddress as string) && (
            <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row pt-10">
              <button
                className="h-10 btn btn-primary rounded-full btn-lg bg-base-100 hover:bg-secondary gap-1"
                onClick={handleClaimPrize}
                disabled={isConfirming || isPending}
              >
                {isConfirming || isPending ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <ArrowLeftEndOnRectangleIcon className="h-6 w-6" />
                )}
                ClaimPrize
              </button>
            </div>
          )}

          {joined && currentState === 2 && isAssassin(connectedAddress) && (
            <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row pt-10">
              <SelectPlayerModal
                addresses={availablePlayerAddresses as AddressType[]}
                modalId="selectPlayer-modal"
                contractName={"MafiaGame"}
                refetchState={refetchState}
                refetchLastKilled={refetchLastKilled}
              />
            </div>
          )}

          {joined && currentPlayer.isAlive && currentState === 3 && !currentPlayer.hasVoted && (
            <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row pt-10">
              <SelectModererModal
                addresses={availableModeratorAddresses as AddressType[]}
                modalId="selectModerer-modal"
                contractName={"MafiaGame"}
                refetchState={refetchState}
              />
            </div>
          )}

          {currentState === 0 && (
            <>
              <p className="text-center text-lg pt-10">
                <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
                  {joined
                    ? `Please wait until the game started (need 4 players to Join)`
                    : `Get started by paying just ${scaffoldConfig.joiningFee} ETH`}
                </code>
              </p>

              <p className="text-center text-lg">
                <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
                  The winning prize will be distributed to the winners!
                </code>
              </p>
            </>
          )}
        </div>

        <div className="flex-grow w-full mt-12 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-2xl w-xl rounded-3xl">
              <UsersIcon className="h-8 w-8 fill-secondary" />
              <p>Joined Players: {playerAddresses.length}</p>
              {players?.map((player, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <Address key={i} address={player.playerAddress} disableAddressLink />
                  {player.playerAddress === currentPlayer.playerAddress && joined && (
                    <span className="text-sm">(YOU)</span>
                  )}
                  {!player.isAlive && <span className="text-sm">(DEAD)</span>}
                </div>
              ))}
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-lg rounded-3xl">
              <ClockIcon className="h-8 w-8 fill-secondary" />
              <p>Game State: {scaffoldConfig.gameState[currentState]?.state}</p>
              {joined && currentState === 2 && <p>{scaffoldConfig.gameState[currentState]?.desc}</p>}
              {joined && currentState === 2 && <p>Your Role: {scaffoldConfig.roles[currentPlayer.role]}</p>}
              {joined && currentState === 3 && (
                <p>
                  Last Killed: {lastKilled}
                  {lastKilled === currentPlayer.playerAddress && joined && <span> (YOU)</span>}
                </p>
              )}
              {joined && currentState === 4 && winners.map((winner, i) => <Address key={i} address={winner} />)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
