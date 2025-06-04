// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Treasury is Ownable(msg.sender) {
	address public mafiaGame;
	mapping(address => uint) public balances;

	modifier onlyMafiaGame() {
		require(
			msg.sender == mafiaGame,
			"Only MafiaGame can call this function"
		);
		_;
	}

	function setMafiaGameAddress(address _mafiaGame) external onlyOwner {
		require(_mafiaGame != address(0), "Invalid MafiaGame address");
		mafiaGame = _mafiaGame;
	}

	function deposit(address player) external payable onlyMafiaGame {
		require(msg.value > 0, "Deposit must be greater than zero");
		balances[player] += msg.value;
	}

	function withdraw(address payable to) external onlyMafiaGame {
		uint amount = balances[to];
		require(amount > 0, "No funds to withdraw");

		balances[to] = 0;
		to.transfer(amount);
	}

	function distributePrize(
		address payable recipient,
		uint amount
	) external onlyMafiaGame {
		require(address(this).balance >= amount, "Not enough funds");
		balances[recipient] = 0;
		recipient.transfer(amount);
	}

	function getBalance() external view returns (uint) {
		return address(this).balance;
	}

	function resetBalances(
		address[] memory playerAddresses
	) external onlyMafiaGame {
		for (uint i = 0; i < playerAddresses.length; i++) {
			balances[playerAddresses[i]] = 0;
		}
	}
}
