import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { expect } from "chai";
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
    baseQueryFee: new anchor.BN(LAMPORTS_PER_SOL / 100),
    queryFeeIncrement: new anchor.BN(LAMPORTS_PER_SOL / 200),
    maxQueryFee: new anchor.BN(LAMPORTS_PER_SOL),
    prizePoolPercentage: 75,
    developerAddress: developerAddress,
  };
  const [configAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programAddress
  );
  const gamePayload = {
    gameId: new anchor.BN(1),
    startTime: new anchor.BN(Math.floor(Date.now() / 1000)),
    duration: new anchor.BN(3600),
    initialPrizePool: new anchor.BN(200),
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
    describe("when invoked with the authorized account", () => {
      it("should initialize config successfully", async () => {
        await program.methods
          .initializeConfig({ ...configPayload })
          .signers([owner])
          .rpc();

        const config = await program.account.configAccount.fetch(configAddress);

        console.log(config);

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

    describe("when invoked with unauthorized account", () => {
      it("should return an error", async () => {
        const promise = program.methods
          .initializeConfig({ ...configPayload })
          .signers([notOwner])
          .rpc();

        return expect(promise).to.be.rejectedWith(Error, "unknown signer");
      });
    });
  });

  describe("Initialize Game", () => {
    describe("when the config has not been initialized", () => {
      it("should return an error", async () => {
        const promise = program.methods
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

        return expect(promise).to.be.rejectedWith(
          Error,
          "AccountNotInitialized"
        );
      });
    });

    describe("when invoked with an unauthorized account", () => {
      beforeEach(async () => {
        await program.methods
          .initializeConfig({ ...configPayload })
          .signers([owner])
          .rpc();
      });

      it("should return an error", () => {
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
    });

    describe("when the config has been initialized", () => {
      beforeEach(async () => {
        await program.methods
          .initializeConfig({ ...configPayload })
          .signers([owner])
          .rpc();
      });

      it("should initialize the game", async () => {
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

    const gameId = new anchor.BN(gamePayload.gameId);
    const requestId = new anchor.BN(Math.random() * 10000);

    it("should return an error if the game has not started", async () => {});

    it("should return an error if the game has ended", async () => {});

    it("should transfer appropriate amount to prize pool and developer accounts", async () => {
      const game = await program.account.gameAccount.fetch(gameAddress);
      const prizePoolBalanceBefore = await client.getBalance(prizePoolAddress);
      const developerBalanceBefore = await client.getBalance(developerAddress);

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

      expect(prizePoolBalanceAfter).to.equal(
        prizePoolBalanceBefore +
          BigInt(
            (game.currentQueryFee.toNumber() * game.prizePoolPercentage) / 100
          ),
        "prize pool share should be transferred to prize pool account"
      );

      expect(developerBalanceAfter).to.equal(
        developerBalanceBefore +
          BigInt(
            game.currentQueryFee.toNumber() *
              (1 - game.prizePoolPercentage / 100)
          ),
        "developer share should be transferred to developer account"
      );
    });

    it("should update the query fee", async () => {
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
      expect(attempt.fee.toNumber()).to.equal(game.currentQueryFee.toNumber());
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
});
