import { BoxyWallet } from './src/boxy_wallet.js';
import { BountyTermsEvaluator } from './src/bounty_terms_evaluator.js';
import { AlpineResourceGuard } from './src/resource_guard.js';
import { ExpiryTracker } from './src/expiry_tracker.js';
import { OmniBlocksBoxyBitcoinExtension } from './src/omniblocks_extension.js';

/**
 * Main application runner for bountyfarmer issue 30.
 * Outputs Hello, World! and executes Boxy Bitcoin wallet telemetry and stipulation verification.
 *
 * @returns {void}
 */
export function main() {
  console.log('Hello, World!');

  const wallet = new BoxyWallet({
    label: "Boxy's Autonomous Bitcoin Vault",
    network: 'mainnet'
  });

  const addresses = wallet.getAddresses();
  console.log(`Boxy SegWit Address: ${addresses.segwit}`);
  console.log(`Boxy P2PKH Address: ${addresses.p2pkh}`);

  const testMessage = 'Boxy Bitcoin Wallet Verification Payload';
  const signature = wallet.signMessage(testMessage);
  const isValid = wallet.verifyMessage(testMessage, signature);
  console.log(`ECDSA Signature Verification: ${isValid ? 'VALID' : 'INVALID'}`);

  wallet.addUTXO({
    txid: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
    vout: 0,
    satoshis: 100000000n,
    confirmations: 6
  });

  const balance = wallet.getBalance();
  console.log(`Boxy Wallet Balance: ${balance.btc} BTC (${balance.satoshis} satoshis)`);

  const guard = new AlpineResourceGuard();
  const memSnapshot = guard.getMemorySnapshot();
  console.log(`Alpine VM Memory Budget: ${memSnapshot.budgetUtilizationPercent}% utilization (Budget: 1.9 GB)`);
  console.log(`Alpine Memory Safe: ${memSnapshot.isWithinBudget && memSnapshot.isHeapSafe}`);

  const terms = new BountyTermsEvaluator(999999n, 0n);
  const evaluation = terms.evaluatePayout(0n);
  console.log(`Statutory Bounty Ceiling: ${evaluation.nominalCeilingBTC}`);
  console.log(`Footnote Stipulation: ${evaluation.noteStipulationBTC}`);
  console.log(`Settlement Compliance: ${evaluation.isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT'}`);
}

main();

export {
  BoxyWallet,
  BountyTermsEvaluator,
  AlpineResourceGuard,
  ExpiryTracker,
  OmniBlocksBoxyBitcoinExtension
};
