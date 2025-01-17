import {
  AnchorProvider,
  Program,
  setProvider,
  Wallet,
} from "@coral-xyz/anchor";
import { clusterApiUrl, Connection } from "@solana/web3.js";

import { Lyra } from "../../target/types/lyra";
import IDL from "../../target/idl/lyra.json";

import { getConfigPDA, ownerKeypair } from "./setup";

const ownerWallet = new Wallet(ownerKeypair);

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const provider = new AnchorProvider(connection, ownerWallet, {
  commitment: "confirmed",
});
setProvider(provider);

const program = new Program<Lyra>(IDL as Lyra, provider);

const config = await program.account.configAccount.fetch(getConfigPDA());
console.log("config account:", config);

const txSignature = await program.methods
  .updateConfig({
    ...config,
    prizePoolPercentage: 75,
  })
  .rpc();
console.log("transaction signature:", txSignature);

const updatedConfig = await program.account.configAccount.fetch(getConfigPDA());
console.log("updated config account:", updatedConfig);
