# 🔫 𝕸𝖆𝖗𝖛𝖊𝖑 𝕲𝖆𝖒𝖊

This project has the purpose of proving that the Marvel game can be part of the web3 space. The game will use a Scaffold ETH template that uses NextJS and Hardhat. Most of the logic will sit off chain, but where it is possible, we can add the functionality on chain.
- 🧪 DOD: Showcase that Marvel game can be integrated and played using Scaffold ETH by choosing from 3 roles (assassin, police officer, citizen), having a total of 4 players and only one team can win: assassins or the town.
- ⚙️ Built using NextJS, RainbowKit, Hardhat, Wagmi, Viem, and Typescript.

## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v18.18)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## Setup

There are a total of 4 available players and 3 of them are NPC.
The user will have to login using his Metamask account then he can press a button to be assigned one of the 3 available roles as such:

- 2 x assassins
- 1 x police officer
- 1 x citizen
  **Secrecy**
  Each individual has its role hidden from the other participants.
  The user can see the other’s wallet addresses but cannot see their roles.
  **Roles**

1. Assassin
   choose somebody to kill (during night)
   can vote (during day)
2. Police Officer
   do an inquiry about somebody else’s role (during night)
   can vote (during day)
3. Citizen
   can vote (during day)

## Stages

**Waiting**

- Players can join game by paying the joining fee. We need 4 players to start game.
- Assign role (only at the beginning)

**Night**

- Assasins’s turn - choose somebody to kill

**Day**

- Narrator’s conclusion from last night: “Last night a person was killed by
  the assassins. The person is {wallet address}.
- The community debate and choose somebody to kill.”
- Voting to kill - choose somebody available from the dropdown list to kill.
  _!!! The person that was kill doesn’t have the right to vote or be killed
  anymore !!!_
- If every live players has the same vote, then the voting should be restarted with the note. **"Voting restarted: One player must have more votes than the others"**

- Narrator displays voting results: “There were {number} amount of votes
  for {wallet address} and {number} amount of votes for {wallet address}. By
  the decision of the community, {wallet address} will be killed”
- Exception: If the vote result is tie or no one voted after 60 seconds, then we should restart voting.

**Check for winners**

At this stage, 2/4 persons were killed.

- If the remaining persons are assassins, then display winner message to both assassins and end game
- If the remaining persons are police officer and citizen, then display winner message to them and end game
- If the remaining persons are 1 assassin and either the citizen or police officer displayer winner message to assassin and end game.

**Display winner message and end game**

- Store prizez and claim them by the winners (when user presses start to chose a role, it will pay 0.1ETH, the game will start with 0.4ETH paid by each participant, when game is over, prize will be split between winners)

## Quickstart

To get started with Marvel game, follow the steps below:

1. Clone this repo & install dependencies

```
git clone https://github.com/musicmediatech/marvel.git
cd marvel
yarn install
```

2. Run a local network in the first terminal:

```
yarn chain
```

This command starts a local Ethereum network using Hardhat. The network runs on your local machine and can be used for testing and development. You can customize the network configuration in `hardhat.config.ts`. 3. On a second terminal, deploy the test contract:

```
yarn deploy
```

This command deploys a test smart contract to the local network. The contract is located in `packages/hardhat/contracts` and can be modified to suit your needs. The `yarn deploy` command uses the deploy script located in `packages/hardhat/deploy` to deploy the contract to the network. You can also customize the deploy script. 4. On a third terminal, start your NextJS app:

```
yarn start
```

Visit your app on: `http://localhost:3000`. You can interact with your smart contract using the `Debug Contracts` page. You can tweak the app config in `packages/nextjs/scaffold.config.ts`.

**What's next**:

- Edit your smart contract `YourContract.sol` in `packages/hardhat/contracts`
- Edit your frontend homepage at `packages/nextjs/app/page.tsx`. For guidance on [routing](https://nextjs.org/docs/app/building-your-application/routing/defining-routes) and configuring [pages/layouts](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts) checkout the Next.js documentation.
- Edit your deployment scripts in `packages/hardhat/deploy`
- Edit your smart contract test in: `packages/hardhat/test`. To run test use `yarn hardhat:test`
- You can add your Alchemy API Key in `scaffold.config.ts` if you want more reliability in your RPC requests.
