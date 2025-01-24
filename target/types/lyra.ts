/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/lyra.json`.
 */
export type Lyra = {
  "address": "7KhyA7H6JsEPuBXoagDusMY8NiZxrgH58yMaSszEpUGw",
  "metadata": {
    "name": "lyra",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "declareWinner",
      "discriminator": [
        140,
        135,
        197,
        50,
        9,
        23,
        4,
        80
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true,
          "address": "8odtA3fjcE5ETP8Ghf7cm3Nb8qestgHWnjEmkjFGZEyG"
        },
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "winnerGameData",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101,
                  95,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              },
              {
                "kind": "account",
                "path": "winner"
              }
            ]
          }
        },
        {
          "name": "prizePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  105,
                  122,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "winner",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "u64"
        },
        {
          "name": "winningRequestId",
          "type": "u64"
        },
        {
          "name": "winnerAddress",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "enterGame",
      "discriminator": [
        157,
        184,
        173,
        203,
        193,
        117,
        106,
        66
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "gameData",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101,
                  95,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "getRefund",
      "discriminator": [
        64,
        110,
        7,
        51,
        88,
        83,
        178,
        158
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "gameData",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101,
                  95,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "prizePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  105,
                  122,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeConfig",
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true,
          "address": "8odtA3fjcE5ETP8Ghf7cm3Nb8qestgHWnjEmkjFGZEyG"
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": {
              "name": "configAccount"
            }
          }
        }
      ]
    },
    {
      "name": "initializeGame",
      "discriminator": [
        44,
        62,
        102,
        247,
        126,
        208,
        130,
        215
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true,
          "address": "8odtA3fjcE5ETP8Ghf7cm3Nb8qestgHWnjEmkjFGZEyG"
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "game_args.game_id"
              }
            ]
          }
        },
        {
          "name": "prizePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  105,
                  122,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "game_args.game_id"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gameArgs",
          "type": {
            "defined": {
              "name": "gameCreationArgs"
            }
          }
        }
      ]
    },
    {
      "name": "playGame",
      "discriminator": [
        37,
        88,
        207,
        85,
        42,
        144,
        122,
        197
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "game",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "gameData",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101,
                  95,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "prizePool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  105,
                  122,
                  101,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "gameId"
              }
            ]
          }
        },
        {
          "name": "developer",
          "writable": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "gameId",
          "type": "u64"
        },
        {
          "name": "requestId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateConfig",
      "discriminator": [
        29,
        158,
        252,
        191,
        10,
        83,
        219,
        99
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true,
          "address": "8odtA3fjcE5ETP8Ghf7cm3Nb8qestgHWnjEmkjFGZEyG"
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "config",
          "type": {
            "defined": {
              "name": "configAccount"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "configAccount",
      "discriminator": [
        189,
        255,
        97,
        70,
        186,
        189,
        24,
        102
      ]
    },
    {
      "name": "gameAccount",
      "discriminator": [
        168,
        26,
        58,
        96,
        13,
        208,
        230,
        188
      ]
    },
    {
      "name": "gameDataAccount",
      "discriminator": [
        83,
        229,
        68,
        63,
        145,
        174,
        71,
        39
      ]
    },
    {
      "name": "prizePoolAccount",
      "discriminator": [
        117,
        162,
        69,
        9,
        212,
        75,
        9,
        239
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidBaseQueryFee",
      "msg": "base query fee should be greater than 0"
    },
    {
      "code": 6001,
      "name": "invalidMaxQueryFee",
      "msg": "max query fee should be greater than base query fee"
    },
    {
      "code": 6002,
      "name": "invalidPrizePoolPercentage",
      "msg": "prize pool percentage should be a value between 0 and 100"
    },
    {
      "code": 6003,
      "name": "invalidGameDuration",
      "msg": "game duration must be greater than 0"
    },
    {
      "code": 6004,
      "name": "invalidGameTime",
      "msg": "start_time + duration should be less than the current timestamp"
    },
    {
      "code": 6005,
      "name": "insufficientBalance",
      "msg": "insufficient balance"
    }
  ],
  "types": [
    {
      "name": "configAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "baseQueryFee",
            "type": "u64"
          },
          {
            "name": "queryFeeIncrement",
            "type": "u64"
          },
          {
            "name": "maxQueryFee",
            "type": "u64"
          },
          {
            "name": "prizePoolPercentage",
            "type": "u8"
          },
          {
            "name": "developer",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "gameAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gameId",
            "type": "u64"
          },
          {
            "name": "currentQueryFee",
            "type": "u64"
          },
          {
            "name": "winner",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "winningAttempt",
            "type": {
              "option": {
                "defined": {
                  "name": "playerAttempt"
                }
              }
            }
          },
          {
            "name": "initialPrizePool",
            "type": "u64"
          },
          {
            "name": "prizePool",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "u64"
          },
          {
            "name": "duration",
            "type": "u64"
          },
          {
            "name": "players",
            "type": "u64"
          },
          {
            "name": "attempts",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "gameCreationArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "gameId",
            "type": "u64"
          },
          {
            "name": "startTime",
            "type": "u64"
          },
          {
            "name": "duration",
            "type": "u64"
          },
          {
            "name": "initialPrizePool",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "gameDataAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "playerAddress",
            "type": "pubkey"
          },
          {
            "name": "refunded",
            "type": "bool"
          },
          {
            "name": "winner",
            "type": "bool"
          },
          {
            "name": "attempts",
            "type": {
              "vec": {
                "defined": {
                  "name": "playerAttempt"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "playerAttempt",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "requestId",
            "type": "u64"
          },
          {
            "name": "fee",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "prizePoolAccount",
      "type": {
        "kind": "struct",
        "fields": []
      }
    }
  ]
};
