"use client";

import { useState } from "react";
import { Address as AddressType } from "viem";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { CheckCircleIcon, ViewfinderCircleIcon } from "@heroicons/react/24/outline";
import { useDeployedContractInfo, useTransactor } from "~~/hooks/scaffold-eth";
import { ContractName } from "~~/utils/scaffold-eth/contract";

type RefetchStateFunction = () => void;

type SelectModererModalProps = {
  addresses: AddressType[];
  modalId: string;
  contractName: ContractName;
  refetchState: RefetchStateFunction;
};

export const SelectModererModal = ({ addresses, modalId, contractName, refetchState }: SelectModererModalProps) => {
  const [selectedAddress, setSelectedAddress] = useState<AddressType>("");
  const { data: hash, writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });
  const writeTxn = useTransactor();
  const { data: mafiaContract } = useDeployedContractInfo(contractName);

  const handleVote = async () => {
    if (writeContractAsync && mafiaContract?.address) {
      try {
        const makeWriteWithParams = () =>
          writeContractAsync({
            address: mafiaContract.address,
            functionName: "voteToKill",
            abi: mafiaContract.abi,
            args: [selectedAddress],
          });
        await writeTxn(makeWriteWithParams);
        refetchState();
      } catch (e: any) {
        console.error("⚡️ ~ file: page.tsx:handleVote ~ error", e);
      }
    }
  };
  return (
    <div>
      <label htmlFor={modalId} className="btn btn-primary btn-lg bg-base-100 gap-1">
        <ViewfinderCircleIcon className="h-6 w-6" />
        <span>VOTE TO KICK OUT</span>
      </label>
      <input type="checkbox" id={modalId} className="modal-toggle" />
      <label htmlFor={modalId} className="modal cursor-pointer">
        <label className="modal-box relative">
          <h3 className="text-xl font-bold mb-3">Vote Who is the Moderator.</h3>
          <label htmlFor={modalId} className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
            ✕
          </label>
          <div className="space-y-3">
            <div className="flex w-full">
              <select
                className="select select-bordered w-full"
                value={selectedAddress}
                onChange={e => setSelectedAddress(e.target.value)}
              >
                <option value="" disabled>
                  Select a Moderator address
                </option>
                {addresses.map((address, index) => (
                  <option key={index} value={address}>
                    {address}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col space-y-3">
              <button
                className="h-10 btn btn-primary btn-sm px-2 rounded-full"
                onClick={() => handleVote()}
                disabled={isPending || isConfirming}
              >
                {isPending || isConfirming ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <CheckCircleIcon className="h-6 w-6" />
                )}
                <span>Vote</span>
              </button>
            </div>
          </div>
        </label>
      </label>
    </div>
  );
};
