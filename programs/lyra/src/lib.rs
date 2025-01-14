use anchor_lang::prelude::*;

declare_id!("7KhyA7H6JsEPuBXoagDusMY8NiZxrgH58yMaSszEpUGw");

const OWNER_PUBKEY: Pubkey = pubkey!("8odtA3fjcE5ETP8Ghf7cm3Nb8qestgHWnjEmkjFGZEyG");

#[program]
pub mod lyra {
    use anchor_lang::solana_program::system_instruction;

    use super::*;

    pub fn initialize_config(
        context: Context<InitializeConfig>,
        config: ConfigAccount,
    ) -> Result<()> {
        require!(config.base_query_fee > 0, LyraError::InvalidBaseQueryFee);
        require!(
            config.max_query_fee > config.base_query_fee,
            LyraError::InvalidMaxQueryFee
        );
        require!(
            config.prize_pool_percentage > 0 && config.prize_pool_percentage < 100,
            LyraError::InvalidPrizePoolPercentage
        );

        context.accounts.config.set_inner(config);

        Ok(())
    }

    pub fn update_config(context: Context<UpdateConfig>, config: ConfigAccount) -> Result<()> {
        require!(config.base_query_fee > 0, LyraError::InvalidBaseQueryFee);
        require!(
            config.max_query_fee > config.base_query_fee,
            LyraError::InvalidMaxQueryFee
        );
        require!(
            config.prize_pool_percentage > 0 && config.prize_pool_percentage < 100,
            LyraError::InvalidPrizePoolPercentage
        );

        context.accounts.config.set_inner(config);

        Ok(())
    }

    pub fn initialize_game(
        context: Context<InitializeGame>,
        game_args: GameCreationArgs,
    ) -> Result<()> {
        let current_timestamp = Clock::get()?.unix_timestamp as u64;
        let balance = context.accounts.signer.get_lamports();

        // checks
        require!(game_args.duration > 0, LyraError::InvalidGameDuration);
        require!(
            game_args.start_time + game_args.duration > current_timestamp,
            LyraError::InvalidGameTime
        );
        require!(
            balance >= game_args.initial_prize_pool,
            LyraError::InsufficientBalance
        );

        // transfer initial prize pool to the prize pool account
        let signer_account = &context.accounts.signer;
        let prize_pool_account = &context.accounts.prize_pool;

        let tx = system_instruction::transfer(
            signer_account.key,
            prize_pool_account.to_account_info().key,
            game_args.initial_prize_pool,
        );

        anchor_lang::solana_program::program::invoke_signed(
            &tx,
            &[
                signer_account.to_account_info(),
                prize_pool_account.to_account_info(),
                context.accounts.system_program.to_account_info(),
            ],
            &[],
        )?;

        // initialize game account
        context.accounts.game.set_inner(GameAccount {
            game_id: game_args.game_id,
            start_time: game_args.start_time,
            duration: game_args.duration,
            initial_prize_pool: game_args.initial_prize_pool,
            prize_pool: game_args.initial_prize_pool,
            prize_pool_percentage: context.accounts.config.prize_pool_percentage,
            current_query_fee: context.accounts.config.base_query_fee,
            winner: None,
            winning_attempt: None,
            players: 0,
            attempts: 0,
        });

        Ok(())
    }

    pub fn enter_game(context: Context<EnterGame>, _game_id: u64) -> Result<()> {
        let game = &context.accounts.game;
        let current_timestamp = Clock::get()?.unix_timestamp as u64;

        // checks
        require!(
            game.start_time <= current_timestamp,
            GameError::GameNotStarted
        );
        require!(
            current_timestamp < game.start_time + game.duration,
            GameError::GameEnded
        );
        require!(game.winner.is_none(), GameError::GameWon);

        // initialize game data account
        context.accounts.game_data.set_inner(GameDataAccount {
            player_address: *context.accounts.player.key,
            attempts: Vec::new(),
            winner: false,
            refunded: false,
        });

        // increment the number of players
        context.accounts.game.players += 1;

        Ok(())
    }

    pub fn play_game(context: Context<PlayGame>, _game_id: u64, request_id: u64) -> Result<()> {
        let config = &context.accounts.config;
        let game = &context.accounts.game;
        let game_data = &context.accounts.game_data;
        let current_timestamp = Clock::get()?.unix_timestamp as u64;
        let player_balance = context.accounts.player.get_lamports();

        // checks
        require!(
            game.start_time <= current_timestamp,
            GameError::GameNotStarted
        );
        require!(
            current_timestamp < game.start_time + game.duration,
            GameError::GameEnded
        );
        require!(game.winner.is_none(), GameError::GameWon);
        require!(
            player_balance > game.current_query_fee,
            GameError::InsufficientQueryFee
        );
        require!(
            game_data
                .attempts
                .iter()
                .filter(|x| x.request_id == request_id)
                .count()
                == 0,
            GameError::RequestIdAlreadyExists
        );

        // transfer to prize pool and developer accounts
        let player_account = &context.accounts.player;
        let prize_pool_account = &context.accounts.prize_pool;
        let developer_account = &context.accounts.developer_address;

        let prize_pool_share = game.current_query_fee * game.prize_pool_percentage as u64 / 100;
        let developer_share = game.current_query_fee - prize_pool_share;

        let tx_1 = system_instruction::transfer(
            player_account.key,
            prize_pool_account.to_account_info().key,
            prize_pool_share,
        );

        let tx_2 = system_instruction::transfer(
            player_account.key,
            developer_account.key,
            developer_share,
        );

        anchor_lang::solana_program::program::invoke_signed(
            &tx_1,
            &[
                player_account.to_account_info(),
                prize_pool_account.to_account_info(),
                context.accounts.system_program.to_account_info(),
            ],
            &[],
        )?;

        anchor_lang::solana_program::program::invoke_signed(
            &tx_2,
            &[
                player_account.to_account_info(),
                developer_account.clone(),
                context.accounts.system_program.to_account_info(),
            ],
            &[],
        )?;

        // store the player attempt
        context.accounts.game_data.attempts.push(PlayerAttempt {
            request_id,
            fee: prize_pool_share,
            timestamp: current_timestamp,
        });

        // update query fee
        let mut new_query_fee = game.current_query_fee + config.query_fee_increment;
        if new_query_fee > config.max_query_fee {
            new_query_fee = config.max_query_fee;
        }
        context.accounts.game.current_query_fee = new_query_fee;

        // update prize pool on game account
        context.accounts.game.prize_pool += prize_pool_share;

        // update the number of attempts
        context.accounts.game.attempts += 1;

        Ok(())
    }

    pub fn declare_winner(
        context: Context<DeclareWinner>,
        _game_id: u64,
        winning_request_id: u64,
        winner_addr: Pubkey,
    ) -> Result<()> {
        let game = &context.accounts.game;
        let current_timestamp = Clock::get()?.unix_timestamp as u64;

        // checks
        require!(
            game.start_time <= current_timestamp,
            GameError::GameNotStarted
        );
        require!(
            current_timestamp < game.start_time + game.duration,
            GameError::GameEnded
        );
        require!(game.winner.is_none(), GameError::WinnerDeclared);

        // set the winner on the game account
        context.accounts.game.winner = Some(winner_addr);

        // set the winning attempt on the game account
        let winning_attempt = context
            .accounts
            .winner_game_data
            .attempts
            .iter()
            .find(|x| x.request_id == winning_request_id)
            .unwrap()
            .clone();
        context.accounts.game.winning_attempt = Some(winning_attempt);

        // set the winner flag on the winner's gamedata account
        context.accounts.winner_game_data.winner = true;

        // transfer prize pool balance to the winner
        let prize = context.accounts.game.prize_pool;
        context.accounts.prize_pool.sub_lamports(prize)?;
        context.accounts.winner_address.add_lamports(prize)?;

        Ok(())
    }

    pub fn get_refund(context: Context<GetRefund>, _game_id: u64) -> Result<()> {
        let game = &context.accounts.game;
        let current_timestamp = Clock::get()?.unix_timestamp as u64;

        // checks
        require!(
            game.start_time <= current_timestamp,
            GameError::GameNotStarted
        );
        require!(game.winner.is_none(), GameError::GameWon);
        require!(
            current_timestamp > game.start_time + game.duration,
            GameError::GameInProgress
        );
        require!(
            !context.accounts.game_data.refunded,
            GameError::RefundClaimed
        );

        // refund player
        let refund_due: u64 = context
            .accounts
            .game_data
            .attempts
            .iter()
            .map(|x| x.fee)
            .sum();

        require!(refund_due > 0, GameError::NoRefundDue);
        context.accounts.prize_pool.sub_lamports(refund_due)?;
        context.accounts.player.add_lamports(refund_due)?;

        // set refunded flag on player's game account
        context.accounts.game_data.refunded = true;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut, address = OWNER_PUBKEY)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + ConfigAccount::INIT_SPACE,
        seeds = [b"config".as_ref()],
        bump
    )]
    pub config: Account<'info, ConfigAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(mut, address = OWNER_PUBKEY)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config".as_ref()],
        bump
    )]
    pub config: Account<'info, ConfigAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct InitializeGame<'info> {
    #[account(mut, address = OWNER_PUBKEY)]
    pub signer: Signer<'info>,

    #[account(
        seeds = [b"config".as_ref()],
        bump
    )]
    pub config: Account<'info, ConfigAccount>,

    #[account(
        init,
        payer = signer,
        space = 8 + GameAccount::INIT_SPACE,
        seeds = [b"game".as_ref(), game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, GameAccount>,

    #[account(
        init,
        payer = signer,
        space = 8 + PrizePoolAccount::INIT_SPACE,
        seeds = [b"prize_pool".as_ref(), game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub prize_pool: Account<'info, PrizePoolAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct EnterGame<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game".as_ref(), game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, GameAccount>,

    #[account(
        init,
        payer = player,
        space = 8 + GameDataAccount::INIT_SPACE,
        seeds = [b"game_data".as_ref(), game_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump
    )]
    pub game_data: Account<'info, GameDataAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct PlayGame<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        seeds = [b"config".as_ref()],
        bump,
        has_one = developer_address
    )]
    pub config: Account<'info, ConfigAccount>,

    #[account(
        mut,
        seeds = [b"game".as_ref(), game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, GameAccount>,

    #[account(
        mut,
        seeds = [b"game_data".as_ref(), game_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump
    )]
    pub game_data: Account<'info, GameDataAccount>,

    #[account(
        mut,
        seeds = [b"prize_pool".as_ref(), game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub prize_pool: Account<'info, PrizePoolAccount>,

    #[account(mut)]
    /// CHECK: This is safe because we don't read or write from this account
    pub developer_address: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(game_id: u64, winner_addr: Pubkey)]
pub struct DeclareWinner<'info> {
    #[account(mut, address = OWNER_PUBKEY)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game".as_ref(), game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, GameAccount>,

    #[account(
        mut,
        seeds = [b"game_data".as_ref(), game_id.to_le_bytes().as_ref(), winner_address.key().as_ref()],
        bump
    )]
    pub winner_game_data: Account<'info, GameDataAccount>,

    #[account(
        mut,
        seeds = [b"prize_pool".as_ref(), game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub prize_pool: Account<'info, PrizePoolAccount>,

    #[account(mut)]
    /// CHECK: This is safe because we don't read or write from this account
    pub winner_address: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(game_id: u64)]
pub struct GetRefund<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game".as_ref(), game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub game: Account<'info, GameAccount>,

    #[account(
        mut,
        seeds = [b"game_data".as_ref(), game_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump
    )]
    pub game_data: Account<'info, GameDataAccount>,

    #[account(
        mut,
        seeds = [b"prize_pool".as_ref(), game_id.to_le_bytes().as_ref()],
        bump
    )]
    pub prize_pool: Account<'info, PrizePoolAccount>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct ConfigAccount {
    pub base_query_fee: u64,
    pub query_fee_increment: u64,
    pub max_query_fee: u64,
    pub prize_pool_percentage: u8,
    pub developer_address: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct GameCreationArgs {
    pub game_id: u64,
    pub start_time: u64,
    pub duration: u64,
    pub initial_prize_pool: u64,
}

#[account]
#[derive(InitSpace)]
pub struct GameAccount {
    pub game_id: u64,
    pub current_query_fee: u64,
    pub winner: Option<Pubkey>,
    pub winning_attempt: Option<PlayerAttempt>,
    pub initial_prize_pool: u64,
    pub prize_pool: u64,
    pub prize_pool_percentage: u8,
    pub start_time: u64,
    pub duration: u64,
    pub players: u64,
    pub attempts: u64,
}

#[account]
#[derive(InitSpace)]
pub struct PrizePoolAccount {}

#[account]
#[derive(InitSpace)]
pub struct PlayerAttempt {
    pub request_id: u64,
    pub fee: u64,
    pub timestamp: u64,
}

#[account]
#[derive(InitSpace)]
pub struct GameDataAccount {
    pub player_address: Pubkey,

    pub refunded: bool,

    pub winner: bool,

    #[max_len(50)]
    pub attempts: Vec<PlayerAttempt>,
}

#[error_code]
pub enum LyraError {
    #[msg("base query fee should be greater than 0")]
    InvalidBaseQueryFee,

    #[msg("max query fee should be greater than base query fee")]
    InvalidMaxQueryFee,

    #[msg("prize pool percentage should be a value between 0 and 100")]
    InvalidPrizePoolPercentage,

    #[msg("game duration must be greater than 0")]
    InvalidGameDuration,

    #[msg("start_time + duration should be less than the current timestamp")]
    InvalidGameTime,

    #[msg("insufficient balance")]
    InsufficientBalance,
}

#[error_code]
pub enum GameError {
    #[msg("game has not started")]
    GameNotStarted,

    #[msg("game has ended")]
    GameEnded,

    #[msg("game is still in progress")]
    GameInProgress,

    #[msg("game has already been won")]
    GameWon,

    #[msg("winner has already been declared")]
    WinnerDeclared,

    #[msg("insufficient query fee")]
    InsufficientQueryFee,

    #[msg("request id already exists")]
    RequestIdAlreadyExists,

    #[msg("request id does not exist")]
    InvalidRequestId,

    #[msg("refund has been claimed")]
    RefundClaimed,

    #[msg("you have no refund to claim")]
    NoRefundDue,
}
