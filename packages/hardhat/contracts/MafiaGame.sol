// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Treasury.sol";

contract MafiaGame {
	enum Role {
		Assassin,
		Police,
		Citizen
	}
	enum GameState {
		Waiting,
		AssigningRoles,
		Night,
		Day,
		Finalizing,
		Finished
	}

	struct Player {
		address playerAddress;
		Role role;
		bool isAlive;
		bool hasVoted;
	}
	struct VoteResult {
		address mostVoted;
		uint highestVotes;
		bool isTie;
	}

	Treasury public treasury;
	GameState public currentState;

	mapping(address => Player) public players;
	mapping(address => uint) public votes;
	address[] public playerAddresses;
	address[] public winners;

	uint public totalVotes;
	uint public startTime;
	address public lastKilled;

	event GameStarted();
	event RoleAssigned(address indexed player, Role role);
	event NightNarration(address indexed killer, address indexed victim);
	event PlayerVoted(address indexed voter, address indexed target);
	event VotingRestarted();
	event DayNarration(address indexed victim);
	event VotingResult(
		address indexed mostVoted,
		uint highestVotes,
		bool isTie
	);
	event PrizeClaimed(address indexed winner, uint amount);
	event GameEnded(address[] winners);
	event GameReset();

	modifier onlyAlive() {
		require(players[msg.sender].isAlive, "You are dead!");
		_;
	}

	modifier onlyInState(GameState state) {
		require(currentState == state, "Invalid game state!");
		_;
	}

	modifier onlyWinner(address caller) {
		bool isWinner = false;
		for (uint i = 0; i < winners.length; i++) {
			if (winners[i] == caller) {
				isWinner = true;
				break;
			}
		}
		require(isWinner, "Caller is not a winner!");
		_;
	}

	modifier onlyAssassin() {
		require(
			players[msg.sender].role == Role.Assassin,
			"You are not an assassin!"
		);
		_;
	}

	constructor(address _treasuryAddress) {
		treasury = Treasury(_treasuryAddress);
		currentState = GameState.Waiting;
	}

	function joinGame() external payable onlyInState(GameState.Waiting) {
		require(msg.value == 0.1 ether, "Must pay 0.1 ETH to join");
		require(playerAddresses.length < 4, "Game is full");
		require(
			players[msg.sender].playerAddress == address(0),
			"Player has already joined"
		);

		players[msg.sender] = Player(msg.sender, Role.Citizen, true, false);
		playerAddresses.push(msg.sender);
		treasury.deposit{ value: msg.value }(msg.sender);

		if (playerAddresses.length == 4) {
			startGame();
		}
	}

	function startGame() private {
		currentState = GameState.AssigningRoles;
		startTime = block.timestamp;
		emit GameStarted();
		assignRoles();
	}

	function assignRoles() private {
		players[playerAddresses[0]].role = Role.Assassin;
		players[playerAddresses[1]].role = Role.Assassin;
		players[playerAddresses[2]].role = Role.Police;
		players[playerAddresses[3]].role = Role.Citizen;

		for (uint256 i = 0; i < playerAddresses.length; i++) {
			emit RoleAssigned(
				playerAddresses[i],
				players[playerAddresses[i]].role
			);
		}

		currentState = GameState.Night;
		startTime = block.timestamp;
	}

	function assassinKill(
		address target
	) external onlyAssassin onlyInState(GameState.Night) onlyAlive {
		require(players[target].isAlive, "Target is already dead!");
		require(target != msg.sender, "Assassin cannot kill themselves!");

		players[target].isAlive = false;
		lastKilled = target;
		startTime = block.timestamp;
		currentState = GameState.Day;
		emit NightNarration(msg.sender, target);
	}

	function voteToKill(
		address target
	) external onlyAlive onlyInState(GameState.Day) {
		require(!players[msg.sender].hasVoted, "You have already voted!");
		require(players[target].isAlive, "Target is already dead!");

		players[msg.sender].hasVoted = true;
		votes[target]++;
		totalVotes++;

		checkVoteResult();
		emit PlayerVoted(msg.sender, target);
	}

	function checkVoteResult() private onlyAlive onlyInState(GameState.Day) {
		VoteResult memory result = _tallyVotes();

		if (!result.isTie && (totalVotes == 3 || hasStageEnded())) {
			players[result.mostVoted].isAlive = false;
			lastKilled = result.mostVoted;
			currentState = GameState.Finalizing;
			checkWinners();
			emit DayNarration(result.mostVoted);
		} else if (hasStageEnded()) {
			resetVoting();
			emit VotingRestarted();
		}

		emit VotingResult(result.mostVoted, result.highestVotes, result.isTie);
	}

	function _tallyVotes() private view returns (VoteResult memory) {
		VoteResult memory result;
		uint highestVotes = 0;
		bool isTie = false;

		for (uint i = 0; i < playerAddresses.length; i++) {
			address player = playerAddresses[i];
			if (players[player].isAlive) {
				if (votes[player] > highestVotes) {
					highestVotes = votes[player];
					result.mostVoted = player;
					isTie = false;
				} else if (votes[player] == highestVotes && highestVotes > 0) {
					isTie = true;
				}
			}
		}

		result.highestVotes = highestVotes;
		result.isTie = isTie;
		return result;
	}

	function resetVoting() private {
		for (uint256 i = 0; i < playerAddresses.length; i++) {
			players[playerAddresses[i]].hasVoted = false;
			votes[playerAddresses[i]] = 0;
		}
		totalVotes = 0;
		startTime = block.timestamp;
	}

	function checkWinners() private {
		uint256 aliveAssassins;
		delete winners;

		for (uint256 i = 0; i < playerAddresses.length; i++) {
			if (!players[playerAddresses[i]].isAlive) continue;

			Role role = players[playerAddresses[i]].role;

			if (role == Role.Assassin) {
				aliveAssassins++;
			} else {
				winners.push(playerAddresses[i]);
			}
		}

		if (aliveAssassins > 0) {
			delete winners;
			for (uint256 i = 0; i < playerAddresses.length; i++) {
				if (
					players[playerAddresses[i]].isAlive &&
					players[playerAddresses[i]].role == Role.Assassin
				) {
					winners.push(playerAddresses[i]);
				}
			}
		}
	}

	function claimPrize()
		external
		onlyAlive
		onlyWinner(msg.sender)
		onlyInState(GameState.Finalizing)
	{
		uint totalPrize = treasury.getBalance();
		uint prizePerWinner = totalPrize / winners.length;

		treasury.distributePrize(payable(msg.sender), prizePerWinner);
		_removeWinner(msg.sender);

		if (winners.length == 0) {
			currentState = GameState.Finished;
			resetGame();
			emit GameEnded(winners);
		}
	}

	function _removeWinner(address winner) private {
		for (uint i = 0; i < winners.length; i++) {
			if (winners[i] == winner) {
				winners[i] = winners[winners.length - 1];
				winners.pop();
				break;
			}
		}
	}

	function resetGame() private onlyInState(GameState.Finished) {
		for (uint i = 0; i < playerAddresses.length; i++) {
			delete players[playerAddresses[i]];
			delete votes[playerAddresses[i]];
		}

		treasury.resetBalances(playerAddresses);
		delete playerAddresses;
		delete lastKilled;
		delete totalVotes;
		delete winners;
		startTime = 0;
		currentState = GameState.Waiting;

		emit GameReset();
	}

	function hasStageEnded() public view returns (bool) {
		return (block.timestamp >= startTime + currentStageDuration());
	}

	function currentStageDuration() public view returns (uint) {
		if (currentState == GameState.AssigningRoles) {
			return 30 seconds;
		} else if (currentState == GameState.Night) {
			return 30 seconds;
		} else if (currentState == GameState.Day) {
			return 60 seconds;
		} else {
			return 0;
		}
	}

	function getAllPlayers() public view returns (Player[] memory) {
		Player[] memory allPlayers = new Player[](playerAddresses.length);
		for (uint256 i = 0; i < playerAddresses.length; i++) {
			allPlayers[i] = players[playerAddresses[i]];
		}
		return allPlayers;
	}

	function getAllWinners() public view returns (address[] memory) {
		address[] memory allWinners = new address[](winners.length);
		for (uint256 i = 0; i < winners.length; i++) {
			allWinners[i] = winners[i];
		}
		return allWinners;
	}
}
