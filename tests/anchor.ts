import * as anchor from "@coral-xyz/anchor";
import assert from "assert";
import * as web3 from "@solana/web3.js";
import type { GlobalDecentralizedMediaOwnership } from "../target/types/global_decentralized_media_ownership";
describe("Global Decentralized Media Ownership", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.GlobalDecentralizedMediaOwnership as anchor.Program<GlobalDecentralizedMediaOwnership>;
  
  // Define mediaKeypair and mediaId at describe level
  let mediaKeypair: web3.Keypair;
  const mediaId = "JHdF";  // Use the same mediaId throughout tests

  it("Initialize Media", async () => {
    // Generate keypair for the new media account
    mediaKeypair = new web3.Keypair();

    // Test data matching UI inputs
    const title = "ZZWI";
    const creator = program.provider.publicKey;

    try {
      // Send transaction
      const txHash = await program.methods
        .initializeMedia(mediaId, title, creator)
        .accounts({
          media: mediaKeypair.publicKey,
          user: program.provider.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .signers([mediaKeypair])
        .rpc();
      
      console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

      // Confirm transaction
      await program.provider.connection.confirmTransaction(txHash);

      // Fetch the created account
      const mediaAccount = await program.account.media.fetch(
        mediaKeypair.publicKey
      );

      // Verify the data
      assert(mediaAccount.mediaId === mediaId);
      assert(mediaAccount.title === title);
      assert(mediaAccount.creator.toBase58() === creator.toBase58());
      assert(mediaAccount.owners[0].toBase58() === creator.toBase58());
      assert(mediaAccount.ownershipPercentage[0] === 100);

      console.log("Media account created successfully!");
      console.log("Media ID:", mediaAccount.mediaId);
      console.log("Title:", mediaAccount.title);
      console.log("Creator:", mediaAccount.creator.toBase58());
    } catch (error) {
      console.error("Error in initialize media:", error);
      throw error;
    }
  });

  it("Transfer Ownership", async () => {
    // Generate a new keypair for the recipient
    const toKeypair = new web3.Keypair();
    const percentage = 47;

    try {
      // Send transaction using the same mediaId as initialization
      const txHash = await program.methods
        .transferOwnership(mediaId, toKeypair.publicKey, percentage)
        .accounts({
          media: mediaKeypair.publicKey,
          from: program.provider.publicKey,
        })
        .rpc();

      console.log(`Use 'solana confirm -v ${txHash}' to see the logs`);

      // Confirm transaction
      await program.provider.connection.confirmTransaction(txHash);

      // Fetch the updated account
      const mediaAccount = await program.account.media.fetch(
        mediaKeypair.publicKey
      );

      // Verify the transfer
      const toIndex = mediaAccount.owners.findIndex(owner => 
        owner.toBase58() === toKeypair.publicKey.toBase58()
      );
      assert(toIndex !== -1, "Recipient not found in owners array");
      assert(mediaAccount.ownershipPercentage[toIndex] === percentage);

      console.log("Ownership transferred successfully!");
      console.log("New owner:", toKeypair.publicKey.toBase58());
      console.log("Transferred percentage:", percentage);
      console.log("Current ownership distribution:");
      mediaAccount.owners.forEach((owner, index) => {
        console.log(`Owner ${index + 1}: ${owner.toBase58()} - ${mediaAccount.ownershipPercentage[index]}%`);
      });
    } catch (error) {
      console.error("Error in transfer ownership:", error);
      throw error;
    }
  });
});