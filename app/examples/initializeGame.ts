import {
  AnchorProvider,
  Program,
  setProvider,
  Wallet,
} from "@coral-xyz/anchor";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { BN } from "bn.js";

import { Lyra } from "../../target/types/lyra";
import IDL from "../../target/idl/lyra.json";

import { Game, GameCreationArgs, getGamePDA, ownerKeypair } from "./setup";

const ownerWallet = new Wallet(ownerKeypair);
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const provider = new AnchorProvider(connection, ownerWallet, {
  commitment: "confirmed",
});
setProvider(provider);

const program = new Program<Lyra>(IDL as Lyra, provider);

const gameArgs: GameCreationArgs = {
  gameId: new BN(1),
  startTime: new BN(Math.floor(Date.now() / 1000)),
  duration: new BN(60 * 60 * 24 * 7),
  initialPrizePool: new BN(LAMPORTS_PER_SOL * 1),
};

const txSignature = await program.methods.initializeGame(gameArgs).rpc();
console.log("transaction signature:", txSignature);

const gamePDA = getGamePDA(gameArgs.gameId);
const game: Game = await program.account.gameAccount.fetch(gamePDA);
console.log("game:", game);
