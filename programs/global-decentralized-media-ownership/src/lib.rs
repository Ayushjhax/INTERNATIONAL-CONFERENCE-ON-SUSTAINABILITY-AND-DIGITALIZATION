use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("2mBqyTHjXrqfk7gikAsbD8evVzUmAuKBmVK2pq2uHCaz");

#[program]
pub mod global_decentralized_media_ownership {
    use super::*;

    pub fn initialize_media(ctx: Context<InitializeMedia>, media_id: String, title: String, creator: Pubkey) -> Result<()> {
        let media = &mut ctx.accounts.media;
        media.media_id = media_id;
        media.title = title;
        media.creator = creator;
        media.owners = vec![creator];
        media.ownership_percentage = vec![100];
        Ok(())
    }

    pub fn transfer_ownership(ctx: Context<TransferOwnership>, media_id: String, to: Pubkey, percentage: u8) -> Result<()> {
        let media = &mut ctx.accounts.media;
        require!(media.media_id == media_id, ErrorCode::InvalidMediaId);
        require!(percentage > 0 && percentage <= 100, ErrorCode::InvalidPercentage);

        let from_index = media.owners.iter().position(|&r| r == ctx.accounts.from.key()).unwrap();
        let current_percentage = media.ownership_percentage[from_index];
        require!(current_percentage >= percentage, ErrorCode::InsufficientOwnership);

        if let Some(to_index) = media.owners.iter().position(|&r| r == to) {
            media.ownership_percentage[to_index] += percentage;
        } else {
            media.owners.push(to);
            media.ownership_percentage.push(percentage);
        }

        media.ownership_percentage[from_index] -= percentage;

        if media.ownership_percentage[from_index] == 0 {
            media.owners.remove(from_index);
            media.ownership_percentage.remove(from_index);
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(media_id: String, title: String, creator: Pubkey)]
pub struct InitializeMedia<'info> {
    #[account(init, payer = user, space = 8 + 32 + 200 + 32 + 32 * 10 + 8 * 10)]
    pub media: Account<'info, Media>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferOwnership<'info> {
    #[account(mut)]
    pub media: Account<'info, Media>,
    pub from: Signer<'info>,
}

#[account]
pub struct Media {
    pub media_id: String,
    pub title: String,
    pub creator: Pubkey,
    pub owners: Vec<Pubkey>,
    pub ownership_percentage: Vec<u8>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid media ID")]
    InvalidMediaId,
    #[msg("Invalid ownership percentage")]
    InvalidPercentage,
    #[msg("Insufficient ownership")]
    InsufficientOwnership,
}