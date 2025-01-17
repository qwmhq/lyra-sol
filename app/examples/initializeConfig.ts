import {
  AnchorProvider,
  Program,
  setProvider,
  Wallet,
} from "@coral-xyz/anchor";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { BN } from "bn.js";

import { Lyra } from "../../target/types/lyra";
import IDL from "../../target/idl/lyra.json";

import { Config, ownerKeypair } from "./setup";

const ownerWallet = new Wallet(ownerKeypair);
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const provider = new AnchorProvider(connection, ownerWallet, {
  commitment: "confirmed",
});
setProvider(provider);

const program = new Program<Lyra>(IDL as Lyra, provider);

const config: Config = {
  baseQueryFee: new BN(LAMPORTS_PER_SOL * 0.2),
  queryFeeIncrement: new BN(LAMPORTS_PER_SOL * 0.2 * 0.5),
  maxQueryFee: new BN(LAMPORTS_PER_SOL),
  prizePoolPercentage: 80,
  developer: new PublicKey("LyrwJQv5QErpKWBVAgAvCMvxnhgiVTj1WAiaGhRyZGj"),
};

const txSignature = await program.methods.initializeConfig(config).rpc();

console.log("transaction signature:", txSignature);
