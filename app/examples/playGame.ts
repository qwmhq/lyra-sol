import {
  AnchorProvider,
  Program,
  setProvider,
  Wallet,
} from "@coral-xyz/anchor";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import { getKeypairFromFile } from "@solana-developers/helpers";
import { BN } from "bn.js";

import { Lyra } from "../../target/types/lyra";
import IDL from "../../target/idl/lyra.json";
import { getGamePDA } from "./setup";

const playerKeypair = await getKeypairFromFile("./player.json");
const playerWallet = new Wallet(playerKeypair);
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const provider = new AnchorProvider(connection, playerWallet, {
  commitment: "confirmed",
});
setProvider(provider);

const program = new Program<Lyra>(IDL as Lyra, provider);

const gameId = new BN(1);
const requestId = new BN(Math.floor(Math.random() * 1000));

const gamePDA = getGamePDA(gameId);
const game = await program.account.gameAccount.fetch(gamePDA);
console.log("game state before playing:", game);

const txSignature = await program.methods.playGame(gameId, requestId).rpc();
console.log("transaction signature:", txSignature);

const gameAfter = await program.account.gameAccount.fetch(gamePDA);
console.log("game state after playing:", gameAfter);
