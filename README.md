# Lyra - Solana Smart Contract

This is a Solana smart contract project built using the Anchor framework. The project includes both the smart contract implementation in Rust and TypeScript tests.

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor Framework](https://www.anchor-lang.com/docs/installation)
- [Node.js](https://nodejs.org/) and [Yarn](https://yarnpkg.com/)

## Project Structure

```
.
├── app/                  # Frontend application (if any)
├── programs/            # Solana program (smart contract)
│   └── lyra/           # Main program
│       └── src/
│           └── lib.rs  # Program logic
├── tests/              # TypeScript tests
├── migrations/         # Database migrations
└── Anchor.toml         # Anchor configuration
```

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd lyra
```

2. Install dependencies:
```bash
yarn install
```

3. Build the program:
```bash
anchor build
```

4. Run tests:
```bash
anchor test
```

## Development

- The smart contract is written in Rust using the Anchor framework
- Tests are written in TypeScript
- The program is configured to run on both localnet and devnet

## Program ID

- Localnet: `7KhyA7H6JsEPuBXoagDusMY8NiZxrgH58yMaSszEpUGw`
- Devnet: `7KhyA7H6JsEPuBXoagDusMY8NiZxrgH58yMaSszEpUGw`

## Available Scripts

- `yarn lint`: Check code formatting
- `yarn lint:fix`: Fix code formatting issues
- `anchor test`: Run the test suite