import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { assert, expect } from "chai";
import { Lyra } from "../target/types/lyra";
import "dotenv/config";
import { getKeypairFromEnvironment } from "@solana-developers/helpers";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { BanksClient, ProgramTestContext } from "solana-bankrun";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);

const IDL = require("../target/idl/lyra.json");

const programAddress = new PublicKey(
  "7KhyA7H6JsEPuBXoagDusMY8NiZxrgH58yMaSszEpUGw"
);

describe("lyra", () => {
  const developerAddress = Keypair.generate().publicKey;
  const owner = getKeypairFromEnvironment("OWNER_SECRETKEY");
  const notOwner = Keypair.generate();

  let context: ProgramTestContext;
  let provider: anchor.Provider;
  let program: anchor.Program<Lyra>;
  let client: BanksClient;

  const configPayload = {
    baseQueryFee: new anchor.BN(LAMPORTS_PER_SOL / 10),
    queryFeeIncrement: new anchor.BN(LAMPORTS_PER_SOL / 100),
    maxQueryFee: new anchor.BN(LAMPORTS_PER_SOL),
    prizePoolPercentage: 80,
    developerAddress: developerAddress,
  };
  const [configAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programAddress
  );
  const gamePayload = {
    gameId: new anchor.BN(Math.random() * 10000),
    startTime: new anchor.BN(Math.floor(Date.now() / 1000)),
    duration: new anchor.BN(60 * 60 * 5),
    initialPrizePool: new anchor.BN(LAMPORTS_PER_SOL / 2),
  };
  const [gameAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), gamePayload.gameId.toArrayLike(Buffer, "le", 8)],
    programAddress
  );
  const [prizePoolAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("prize_pool"),
      gamePayload.gameId.toArrayLike(Buffer, "le", 8),
    ],
    programAddress
  );

  const players = Array(5)
    .fill(undefined)
    .map((_) => {
      const keypair = Keypair.generate();
      const [gameDataAddress] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("game_data"),
          gamePayload.gameId.toArrayLike(Buffer, "le", 8),
          keypair.publicKey.toBuffer(),
        ],
        programAddress
      );
      return { keypair, gameDataAddress };
    });

  beforeEach(async () => {
    context = await startAnchor(
      "",
      [{ name: "lyra", programId: programAddress }],
      [
        {
          address: owner.publicKey,
          info: {
            lamports: LAMPORTS_PER_SOL,
            data: Buffer.alloc(0),
            owner: SYSTEM_PROGRAM_ID,
            executable: false,
          },
        },
        {
          address: notOwner.publicKey,
          info: {
            lamports: LAMPORTS_PER_SOL,
            data: Buffer.alloc(0),
            owner: SYSTEM_PROGRAM_ID,
            executable: false,
          },
        },
        ...players.map((p) => ({
          address: p.keypair.publicKey,
          info: {
            lamports: LAMPORTS_PER_SOL,
            data: Buffer.alloc(0),
            owner: SYSTEM_PROGRAM_ID,
            executable: false,
          },
        })),
      ]
    );
    provider = new BankrunProvider(context);
    program = new Program<Lyra>(IDL, provider);
    client = context.banksClient;
  });

  describe("Initialize Config", () => {
    it("should return an error when invoked with unauthorized account", async () => {
      const promise = program.methods
        .initializeConfig({ ...configPayload })
        .accountsPartial({ signer: notOwner.publicKey })
        .signers([notOwner])
        .rpc();

      return expect(promise).to.be.rejectedWith(Error, "ConstraintAddress");
    });

    it("should initialize config account", async () => {
      await program.methods
        .initializeConfig({ ...configPayload })
        .signers([owner])
        .rpc();

      const config = await program.account.configAccount.fetch(configAddress);

      expect(config.baseQueryFee.toNumber()).to.equal(
        configPayload.baseQueryFee.toNumber()
      );
      expect(config.queryFeeIncrement.toNumber()).to.equal(
        configPayload.queryFeeIncrement.toNumber()
      );
      expect(config.maxQueryFee.toNumber()).to.equal(
        configPayload.maxQueryFee.toNumber()
      );
      expect(config.prizePoolPercentage).to.equal(
        configPayload.prizePoolPercentage
      );
      expect(config.developerAddress).to.deep.equal(
        configPayload.developerAddress
      );
    });
  });

  describe("Initialize Game", () => {
    beforeEach(async () => {
      await program.methods
        .initializeConfig({ ...configPayload })
        .signers([owner])
        .rpc();
    });

    it("should return an error when invoked with an unauthorized account", () => {
      const promise = program.methods
        .initializeGame({ ...gamePayload })
        .accountsStrict({
          signer: notOwner.publicKey,
          config: configAddress,
          game: gameAddress,
          prizePool: prizePoolAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([notOwner])
        .rpc();

      return expect(promise).to.be.rejectedWith(Error, "ConstraintAddress");
    });

    it("should initialize the game account", async () => {
      await program.methods
        .initializeGame({ ...gamePayload })
        .accountsStrict({
          signer: owner.publicKey,
          config: configAddress,
          game: gameAddress,
          prizePool: prizePoolAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const game = await program.account.gameAccount.fetch(gameAddress);
      expect(game.gameId.toNumber()).to.equal(gamePayload.gameId.toNumber());
      expect(game.currentQueryFee.toNumber()).to.equal(
        configPayload.baseQueryFee.toNumber()
      );
      expect(game.startTime.toNumber()).to.equal(
        gamePayload.startTime.toNumber()
      );
      expect(game.duration.toNumber()).to.equal(
        gamePayload.duration.toNumber()
      );
      expect(game.initialPrizePool.toNumber()).to.equal(
        gamePayload.initialPrizePool.toNumber()
      );
      expect(game.prizePoolPercentage).to.equal(
        configPayload.prizePoolPercentage
      );
      expect(game.winner).to.be.null;
      expect(game.winningAttempt).to.be.null;
      expect(game.attempts.toNumber()).to.equal(0);
      expect(game.players.toNumber()).to.equal(0);
    });

    it("should transfer initial prize pool amount to the prize pool account", async () => {
      const prizePoolBalanceBefore = await client.getBalance(prizePoolAddress);

      await program.methods
        .initializeGame({ ...gamePayload })
        .accountsStrict({
          signer: owner.publicKey,
          config: configAddress,
          game: gameAddress,
          prizePool: prizePoolAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const prizePoolBalanceAfter = await client.getBalance(prizePoolAddress);

      assert(
        prizePoolBalanceAfter >=
          prizePoolBalanceBefore +
            BigInt(gamePayload.initialPrizePool.toNumber()),
        "initial prize pool amount should be transferred to prize pool account"
      );
    });
  });

  describe("enter game", () => {
    beforeEach(async () => {
      await program.methods
        .initializeConfig({ ...configPayload })
        .signers([owner])
        .rpc();

      await program.methods
        .initializeGame({ ...gamePayload })
        .accountsStrict({
          signer: owner.publicKey,
          config: configAddress,
          game: gameAddress,
          prizePool: prizePoolAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();
    });

    it("should return an error if the game has not started", async () => {});

    it("should return an error if the game has ended", async () => {});

    it("should return an error if the game has been won", async () => {});

    it("should initialize the game data account", async () => {
      await program.methods
        .enterGame(gamePayload.gameId)
        .accounts({ player: players[0].keypair.publicKey })
        .signers([players[0].keypair])
        .rpc();

      const gameData = await program.account.gameDataAccount.fetch(
        players[0].gameDataAddress
      );

      expect(gameData.playerAddress).to.deep.equal(
        players[0].keypair.publicKey
      );
      expect(gameData.attempts).to.be.empty;
      expect(gameData.winner).to.be.false;
      expect(gameData.refunded).to.be.false;
    });

    it("should increment the player count on the game account", async () => {
      const gameBefore = await program.account.gameAccount.fetch(gameAddress);

      await program.methods
        .enterGame(gamePayload.gameId)
        .accounts({ player: players[0].keypair.publicKey })
        .signers([players[0].keypair])
        .rpc();

      const gameAfter = await program.account.gameAccount.fetch(gameAddress);

      expect(gameAfter.players.toNumber()).to.equal(
        gameBefore.players.toNumber() + 1
      );
    });
  });

  describe("play game", () => {
    beforeEach(async () => {
      await program.methods
        .initializeConfig({ ...configPayload })
        .signers([owner])
        .rpc();

      await program.methods
        .initializeGame({ ...gamePayload })
        .accountsStrict({
          signer: owner.publicKey,
          config: configAddress,
          game: gameAddress,
          prizePool: prizePoolAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      await program.methods
        .enterGame(gamePayload.gameId)
        .accounts({ player: players[0].keypair.publicKey })
        .signers([players[0].keypair])
        .rpc();
    });

    const gameId = gamePayload.gameId;
    const requestId = new anchor.BN(Math.random() * 10000);

    it("should return an error if the game has not started", async () => {});

    it("should return an error if the game has ended", async () => {});

    it("should transfer appropriate amount to prize pool and developer accounts", async () => {
      const game = await program.account.gameAccount.fetch(gameAddress);
      const prizePoolBalanceBefore = await client.getBalance(prizePoolAddress);
      const developerBalanceBefore = await client.getBalance(developerAddress);

      const prizePoolShare =
        (game.currentQueryFee.toNumber() * game.prizePoolPercentage) / 100;
      const developerShare = game.currentQueryFee.toNumber() - prizePoolShare;

      await program.methods
        .playGame(gameId, requestId)
        .accountsStrict({
          player: players[0].keypair.publicKey,
          config: configAddress,
          game: gameAddress,
          prizePool: prizePoolAddress,
          developerAddress,
          gameData: players[0].gameDataAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([players[0].keypair])
        .rpc();

      const prizePoolBalanceAfter = await client.getBalance(prizePoolAddress);
      const developerBalanceAfter = await client.getBalance(developerAddress);

      expect(Number(prizePoolBalanceAfter)).to.equal(
        Number(prizePoolBalanceBefore) + prizePoolShare,
        "prize pool share should be transferred to prize pool account"
      );

      expect(Number(developerBalanceAfter)).to.equal(
        Number(developerBalanceBefore) + developerShare,
        "developer share should be transferred to developer account"
      );
    });

    it("should update the prize pool on the game account", async () => {
      const gameBefore = await program.account.gameAccount.fetch(gameAddress);

      await program.methods
        .playGame(gameId, requestId)
        .accountsStrict({
          player: players[0].keypair.publicKey,
          config: configAddress,
          game: gameAddress,
          prizePool: prizePoolAddress,
          developerAddress,
          gameData: players[0].gameDataAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([players[0].keypair])
        .rpc();

      const gameAfter = await program.account.gameAccount.fetch(gameAddress);

      expect(gameAfter.prizePool.toNumber()).to.equal(
        gameBefore.prizePool.toNumber() +
          gameBefore.currentQueryFee.toNumber() *
            (gameBefore.prizePoolPercentage / 100)
      );
    });

    it("should update the query fee on the game account", async () => {
      const gameBefore = await program.account.gameAccount.fetch(gameAddress);
      const config = await program.account.configAccount.fetch(configAddress);

      await program.methods
        .playGame(gameId, requestId)
        .accountsStrict({
          player: players[0].keypair.publicKey,
          config: configAddress,
          game: gameAddress,
          prizePool: prizePoolAddress,
          developerAddress,
          gameData: players[0].gameDataAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([players[0].keypair])
        .rpc();

      const gameAfter = await program.account.gameAccount.fetch(gameAddress);

      expect(gameAfter.currentQueryFee.toNumber()).to.equal(
        gameBefore.currentQueryFee.toNumber() +
          config.queryFeeIncrement.toNumber()
      );
    });

    it("should store the player attempt", async () => {
      const game = await program.account.gameAccount.fetch(gameAddress);

      await program.methods
        .playGame(gameId, requestId)
        .accountsStrict({
          player: players[0].keypair.publicKey,
          config: configAddress,
          game: gameAddress,
          prizePool: prizePoolAddress,
          developerAddress,
          gameData: players[0].gameDataAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([players[0].keypair])
        .rpc();

      const gameData = await program.account.gameDataAccount.fetch(
        players[0].gameDataAddress
      );
      const attempt = gameData.attempts.find(
        (x) => x.requestId.toNumber() == requestId.toNumber()
      );

      expect(gameData.playerAddress).to.deep.equal(
        players[0].keypair.publicKey
      );
      expect(attempt).to.not.be.undefined;
      expect(attempt.requestId.toNumber()).to.equal(requestId.toNumber());
      expect(attempt.fee.toNumber()).to.equal(
        game.currentQueryFee.toNumber() * (game.prizePoolPercentage / 100)
      );
    });

    it("should increment the attempt count on the game account", async () => {
      const gameBefore = await program.account.gameAccount.fetch(gameAddress);

      await program.methods
        .playGame(gameId, requestId)
        .accountsStrict({
          player: players[0].keypair.publicKey,
          config: configAddress,
          game: gameAddress,
          prizePool: prizePoolAddress,
          developerAddress,
          gameData: players[0].gameDataAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([players[0].keypair])
        .rpc();

      const gameAfter = await program.account.gameAccount.fetch(gameAddress);

      expect(gameAfter.attempts.toNumber()).to.equal(
        gameBefore.attempts.toNumber() + 1
      );
    });
  });

  describe("declare winner", () => {
    beforeEach(async () => {
      await program.methods
        .initializeConfig({ ...configPayload })
        .signers([owner])
        .rpc();

      await program.methods
        .initializeGame({ ...gamePayload })
        .accountsStrict({
          signer: owner.publicKey,
          config: configAddress,
          game: gameAddress,
          prizePool: prizePoolAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      await Promise.all(
        players.map((player) => {
          return program.methods
            .enterGame(gamePayload.gameId)
            .accounts({ player: player.keypair.publicKey })
            .signers([player.keypair])
            .rpc();
        })
      );

      await Promise.all(
        players.map((player) => {
          const gameId = gamePayload.gameId;
          const requestId = new anchor.BN(Math.random() * 10000);

          return program.methods
            .playGame(gameId, requestId)
            .accountsStrict({
              player: player.keypair.publicKey,
              config: configAddress,
              game: gameAddress,
              prizePool: prizePoolAddress,
              developerAddress,
              gameData: player.gameDataAddress,
              systemProgram: SystemProgram.programId,
            })
            .signers([player.keypair])
            .rpc();
        })
      );
    });

    it("should return an error when invoked with unauthorized account", async () => {
      const winner = players[Math.floor(Math.random() * players.length)];
      const winningRequestId = new anchor.BN(Math.random() * 1000);

      const promise = program.methods
        .declareWinner(
          gamePayload.gameId,
          winningRequestId,
          winner.keypair.publicKey
        )
        .accountsStrict({
          signer: notOwner.publicKey,
          game: gameAddress,
          winnerGameData: winner.gameDataAddress,
          winnerAddress: winner.keypair.publicKey,
          prizePool: prizePoolAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([notOwner])
        .rpc();

      return expect(promise).to.be.rejectedWith(Error, "ConstraintAddress");
    });

    it("should return an error if the game has not started", async () => {});

    it("should return an error if the game has ended", async () => {});

    it("should return an error if a winner has already been declared", async () => {});

    it("should transfer prize pool balance to the winner", async () => {
      const gameId = gamePayload.gameId;
      const winner = players[Math.floor(Math.random() * players.length)];
      const winningRequestId = new anchor.BN(Math.random() * 1000);

      await program.methods
        .playGame(gameId, winningRequestId)
        .accountsStrict({
          player: winner.keypair.publicKey,
          config: configAddress,
          game: gameAddress,
          prizePool: prizePoolAddress,
          developerAddress,
          gameData: winner.gameDataAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([winner.keypair])
        .rpc();

      const game = await program.account.gameAccount.fetch(gameAddress);
      const winnerBalanceBefore = await client.getBalance(
        winner.keypair.publicKey
      );

      await program.methods
        .declareWinner(
          gamePayload.gameId,
          winningRequestId,
          winner.keypair.publicKey
        )
        .accountsStrict({
          signer: owner.publicKey,
          game: gameAddress,
          winnerGameData: winner.gameDataAddress,
          winnerAddress: winner.keypair.publicKey,
          prizePool: prizePoolAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const winnerBalanceAfter = await client.getBalance(
        winner.keypair.publicKey
      );

      expect(winnerBalanceAfter).to.equal(
        winnerBalanceBefore + BigInt(game.prizePool.toNumber())
      );
    });

    it("should set the 'winner' and 'winning_attempt' fields on the game account", async () => {
      const gameId = gamePayload.gameId;
      const winner = players[Math.floor(Math.random() * players.length)];
      const winningRequestId = new anchor.BN(Math.random() * 1000);

      await program.methods
        .playGame(gameId, winningRequestId)
        .accountsStrict({
          player: winner.keypair.publicKey,
          config: configAddress,
          game: gameAddress,
          prizePool: prizePoolAddress,
          developerAddress,
          gameData: winner.gameDataAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([winner.keypair])
        .rpc();

      await program.methods
        .declareWinner(
          gamePayload.gameId,
          winningRequestId,
          winner.keypair.publicKey
        )
        .accountsStrict({
          signer: owner.publicKey,
          game: gameAddress,
          winnerGameData: winner.gameDataAddress,
          winnerAddress: winner.keypair.publicKey,
          prizePool: prizePoolAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const game = await program.account.gameAccount.fetch(gameAddress);

      expect(
        game.winner,
        "winner field should be set on game account"
      ).to.deep.equal(winner.keypair.publicKey);

      expect(game.winningAttempt).to.not.be.null;
      expect(
        game.winningAttempt.requestId.toNumber(),
        "winning attempt should contain the correct request id"
      ).to.equal(winningRequestId.toNumber());
    });

    it("should set the 'winner' field on the winner's game data account", async () => {
      const gameId = gamePayload.gameId;
      const winner = players[Math.floor(Math.random() * players.length)];
      const winningRequestId = new anchor.BN(Math.random() * 1000);

      await program.methods
        .playGame(gameId, winningRequestId)
        .accountsStrict({
          player: winner.keypair.publicKey,
          config: configAddress,
          game: gameAddress,
          prizePool: prizePoolAddress,
          developerAddress,
          gameData: winner.gameDataAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([winner.keypair])
        .rpc();

      await program.methods
        .declareWinner(
          gamePayload.gameId,
          winningRequestId,
          winner.keypair.publicKey
        )
        .accountsStrict({
          signer: owner.publicKey,
          game: gameAddress,
          winnerGameData: winner.gameDataAddress,
          winnerAddress: winner.keypair.publicKey,
          prizePool: prizePoolAddress,
          systemProgram: SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      const winnerGameData = await program.account.gameDataAccount.fetch(
        winner.gameDataAddress
      );

      expect(winnerGameData.winner).to.be.true;
    });
  });
});
