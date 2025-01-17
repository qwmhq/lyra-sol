import "dotenv/config";
import { BN, IdlAccounts, IdlTypes } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Lyra } from "../../target/types/lyra";
import { getKeypairFromEnvironment } from "@solana-developers/helpers";

export const programId = new PublicKey(
  "7KhyA7H6JsEPuBXoagDusMY8NiZxrgH58yMaSszEpUGw"
);

export const ownerKeypair = getKeypairFromEnvironment("OWNER_SECRETKEY");

export type Config = IdlAccounts<Lyra>["configAccount"];
export type Game = IdlAccounts<Lyra>["gameAccount"];
export type GameData = IdlAccounts<Lyra>["gameDataAccount"];
export type GameCreationArgs = IdlTypes<Lyra>["gameCreationArgs"];

export const getConfigPDA = () =>
  PublicKey.findProgramAddressSync([Buffer.from("config")], programId)[0];

export const getGamePDA = (gameId: BN) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("game"), gameId.toArrayLike(Buffer, "le", 8)],
    programId
  )[0];
};

export const getPrizePoolPDA = (gameId: BN) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("prize_pool"), gameId.toArrayLike(Buffer, "le", 8)],
    programId
  )[0];
};

export const getPlayerDataPDA = (gameId: BN, playerAddress: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("game_data"),
      gameId.toArrayLike(Buffer, "le", 8),
      playerAddress.toBuffer(),
    ],
    programId
  )[0];
};
