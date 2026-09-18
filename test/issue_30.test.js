import { execSync } from 'child_process';
import { strict as assert } from 'assert';
import {
  sha256,
  hash256,
  ripemd160,
  hash160,
  base58Encode,
  base58Decode,
  base58CheckEncode,
  base58CheckDecode,
  encodeBech32,
  convertBits,
  compressPublicKey,
  decompressPublicKey,
  deriveP2PKHAddress,
  deriveSegWitAddress,
  encodeWIF,
  decodeWIF
} from '../src/crypto_utils.js';
import { BoxyWallet } from '../src/boxy_wallet.js';
import { AlpineResourceGuard } from '../src/resource_guard.js';
import { BountyTermsEvaluator } from '../src/bounty_terms_evaluator.js';
import { ExpiryTracker } from '../src/expiry_tracker.js';
import { OmniBlocksBoxyBitcoinExtension } from '../src/omniblocks_extension.js';

/**
 * Tests execution of index.js CLI entrypoint.
 *
 * @returns {void}
 */
function testIndexExecution() {
  const output = execSync('node index.js', { encoding: 'utf-8' });
  assert.ok(output.includes('Hello, World!'), 'Expected Hello, World! in output');
  assert.ok(output.includes('Boxy SegWit Address: bc1q'), 'Expected Boxy SegWit address in output');
  assert.ok(output.includes('Boxy P2PKH Address: 1'), 'Expected Boxy P2PKH address in output');
  assert.ok(output.includes('ECDSA Signature Verification: VALID'), 'Expected signature verification in output');
  assert.ok(output.includes('Alpine Memory Safe: true'), 'Expected Alpine memory safety in output');
  assert.ok(output.includes('Statutory Bounty Ceiling: 999999 BTC'), 'Expected 999999 BTC ceiling in output');
  assert.ok(output.includes('Footnote Stipulation: 0 BTC'), 'Expected 0 BTC note in output');
  assert.ok(output.includes('Settlement Compliance: COMPLIANT'), 'Expected compliance in output');
}

/**
 * Tests core cryptographic utilities and test vectors.
 *
 * @returns {void}
 */
function testCryptoUtils() {
  const emptyHash = sha256(Buffer.alloc(0)).toString('hex');
  assert.equal(emptyHash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

  const doubleSha = hash256(Buffer.from('OmniBlocks')).toString('hex');
  assert.equal(doubleSha.length, 64);

  const ripemd = ripemd160(Buffer.from('OmniBlocks')).toString('hex');
  assert.equal(ripemd.length, 40);

  const h160Digest = hash160(Buffer.from('OmniBlocks')).toString('hex');
  assert.equal(h160Digest.length, 40);

  const testPayload = Buffer.from('BoxyWalletCrypto');
  const encoded58 = base58Encode(testPayload);
  const decoded58 = base58Decode(encoded58);
  assert.deepEqual(decoded58, testPayload);

  const checkEncoded = base58CheckEncode(0x00, testPayload);
  const checkDecoded = base58CheckDecode(checkEncoded);
  assert.equal(checkDecoded.version, 0x00);
  assert.deepEqual(checkDecoded.payload, testPayload);

  assert.throws(() => {
    base58CheckDecode('11111BadChecksumValue');
  });

  const rawBits = [1, 2, 3, 4];
  const converted = convertBits(rawBits, 8, 5, true);
  assert.ok(Array.isArray(converted));

  const bechAddress = encodeBech32('bc', [0, 14, 20, 31]);
  assert.ok(bechAddress.startsWith('bc1'));
}

/**
 * Tests key generation, address derivation, and WIF formatting.
 *
 * @returns {void}
 */
function testBoxyWalletKeyAndAddressGeneration() {
  const wallet = new BoxyWallet();

  const addresses = wallet.getAddresses();
  assert.ok(addresses.p2pkh.startsWith('1'), 'Mainnet P2PKH must start with 1');
  assert.ok(addresses.segwit.startsWith('bc1q'), 'Mainnet SegWit must start with bc1q');
  assert.equal(addresses.network, 'mainnet');

  const wif = wallet.getWIF();
  assert.ok(wif.startsWith('K') || wif.startsWith('L'), 'Mainnet compressed WIF must start with K or L');

  const importedWallet = new BoxyWallet({ wif });
  assert.equal(importedWallet.getAddresses().p2pkh, addresses.p2pkh);
  assert.equal(importedWallet.getAddresses().segwit, addresses.segwit);
  assert.deepEqual(importedWallet.getPrivateKey(), wallet.getPrivateKey());

  const testnetWallet = new BoxyWallet({ network: 'testnet' });
  const testnetAddrs = testnetWallet.getAddresses();
  assert.ok(testnetAddrs.p2pkh.startsWith('m') || testnetAddrs.p2pkh.startsWith('n'));
  assert.ok(testnetAddrs.segwit.startsWith('tb1q'));

  const deterministicKeyHex = '0000000000000000000000000000000000000000000000000000000000000001';
  const deterministicWallet = new BoxyWallet({ privateKeyHex: deterministicKeyHex });
  assert.equal(deterministicWallet.getAddresses().p2pkh, '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH');
}

/**
 * Tests ECDSA message signing, verification, and tamper detection.
 *
 * @returns {void}
 */
function testBoxyWalletSigningAndVerification() {
  const wallet = new BoxyWallet();
  const message = 'Autonomous Boxy Bitcoin Verification';

  const signature = wallet.signMessage(message);
  assert.ok(typeof signature === 'string');
  assert.ok(signature.length > 60);

  const isValid = wallet.verifyMessage(message, signature);
  assert.equal(isValid, true);

  const tamperedMessage = 'Compromised Boxy Message';
  const isTamperedValid = wallet.verifyMessage(tamperedMessage, signature);
  assert.equal(isTamperedValid, false);

  const otherWallet = new BoxyWallet();
  const isOtherKeyValid = wallet.verifyMessage(message, signature, otherWallet.getPublicKey(true));
  assert.equal(isOtherKeyValid, false);
}

/**
 * Tests UTXO addition, balance calculation, and transaction execution.
 *
 * @returns {void}
 */
function testBoxyWalletUTXOAndTransactions() {
  const wallet = new BoxyWallet();

  const emptyBalance = wallet.getBalance();
  assert.equal(emptyBalance.satoshis, 0n);
  assert.equal(emptyBalance.btc, '0.00000000');

  wallet.addUTXO({
    txid: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    vout: 0,
    satoshis: 50000000n
  });
  wallet.addUTXO({
    txid: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    vout: 1,
    satoshis: 25000000n
  });

  const fundedBalance = wallet.getBalance();
  assert.equal(fundedBalance.satoshis, 75000000n);
  assert.equal(fundedBalance.btc, '0.75000000');

  const recipient = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
  const tx = wallet.createTransaction({
    recipientAddress: recipient,
    satoshis: 40000000n,
    feeSatoshis: 5000n
  });

  assert.ok(tx.txid);
  assert.equal(tx.outputs[0].address, recipient);
  assert.equal(tx.outputs[0].satoshis, 40000000n);
  assert.equal(tx.feeSatoshis, 5000n);

  const remainingBalance = wallet.getBalance();
  assert.equal(remainingBalance.satoshis, 75000000n - 40000000n - 5000n);

  assert.throws(() => {
    wallet.createTransaction({
      recipientAddress: recipient,
      satoshis: 999999999999n
    });
  });

  const telemetry = wallet.getTelemetry();
  assert.equal(telemetry.owner, 'boxycpu');
  assert.equal(telemetry.txCount, 1);
  assert.equal(telemetry.alpineSafeStatus, true);
}

/**
 * Tests Alpine Linux 1.9GB VM resource bounds and telemetry.
 *
 * @returns {void}
 */
function testAlpineResourceGuard() {
  const guard = new AlpineResourceGuard();
  const snapshot = guard.getMemorySnapshot();

  assert.equal(snapshot.ramBudgetBytes, Math.floor(1.9 * 1024 * 1024 * 1024));
  assert.equal(snapshot.isWithinBudget, true);
  assert.equal(snapshot.isHeapSafe, true);
  assert.ok(snapshot.budgetUtilizationPercent < 50.0);

  const audit = guard.auditProcessIntegrity();
  assert.equal(audit.status, 'OPERATIONAL_AND_SECURE');
  assert.equal(audit.sketchyProcessesDetected, false);

  assert.equal(guard.isAllocationPermitted(1024 * 1024), true);
  assert.equal(guard.enforceCapacityLimit(100, 'utxo'), true);

  assert.throws(() => {
    guard.enforceCapacityLimit(10000, 'utxo');
  });
}

/**
 * Tests BountyTermsEvaluator for the 999,999 BTC ceiling vs 0 BTC note stipulation.
 *
 * @returns {void}
 */
function testBountyTermsEvaluator() {
  const evaluator = new BountyTermsEvaluator(999999n, 0n);

  assert.equal(evaluator.getNominalCeilingBTC(), 999999n);
  assert.equal(evaluator.getNominalCeilingSatoshis(), 99999900000000n);
  assert.equal(evaluator.getNoteBountyBTC(), 0n);
  assert.equal(evaluator.getNoteBountySatoshis(), 0n);

  assert.equal(evaluator.isWithinUpToLimit(0n), true);
  assert.equal(evaluator.isWithinUpToLimit(1n), true);
  assert.equal(evaluator.isWithinUpToLimit(999999n), true);
  assert.equal(evaluator.isWithinUpToLimit(1000000n), false);
  assert.equal(evaluator.isWithinUpToLimit(-1n), false);

  const evaluation = evaluator.evaluatePayout(0n);
  assert.equal(evaluation.isCompliant, true);
  assert.equal(evaluation.isZeroSettlementValid, true);
  assert.equal(evaluation.nominalCeilingBTC, '999999 BTC');
  assert.equal(evaluation.noteStipulationBTC, '0 BTC');
  assert.equal(evaluation.actualSettlementBTC, '0 BTC');
  assert.ok(evaluation.stipulationLegalAnalysis.includes('up to 999999 bitcoin'));

  const fiatValue = evaluator.convertSatoshisToFiat(100000000n, 'USD', 65000);
  assert.equal(fiatValue, 65000);
}

/**
 * Tests issue expiration tracking logic.
 *
 * @returns {void}
 */
function testExpiryTracker() {
  const createdAt = '2026-09-18T03:00:00.000Z';
  const tracker = new ExpiryTracker(createdAt, 1440);

  const insideWindow = '2026-09-18T10:00:00.000Z';
  const checkInside = tracker.checkExpiry(insideWindow);
  assert.equal(checkInside.isExpired, false);
  assert.ok(checkInside.remainingSeconds > 0);
  assert.equal(tracker.isEligible(insideWindow), true);

  const outsideWindow = '2026-09-19T04:00:00.000Z';
  const checkOutside = tracker.checkExpiry(outsideWindow);
  assert.equal(checkOutside.isExpired, true);
  assert.ok(checkOutside.remainingSeconds < 0);
  assert.equal(tracker.isEligible(outsideWindow), false);
}

/**
 * Tests OmniBlocks extension definitions and block handlers.
 *
 * @returns {void}
 */
function testOmniBlocksExtension() {
  const extension = new OmniBlocksBoxyBitcoinExtension();
  const info = extension.getInfo();

  assert.equal(info.id, 'omniblocksBoxyBitcoin');
  assert.equal(info.name, 'Boxy Bitcoin Wallet');
  assert.ok(info.blocks.length >= 7);

  const segwitAddress = extension.getBoxyAddress({ TYPE: 'segwit' });
  assert.ok(segwitAddress.startsWith('bc1q'));

  const p2pkhAddress = extension.getBoxyAddress({ TYPE: 'p2pkh' });
  assert.ok(p2pkhAddress.startsWith('1'));

  const balance = extension.getBoxyBalance();
  assert.equal(balance, 0);

  const signature = extension.signBoxyMessage({ MESSAGE: 'Boxy Scratch Test' });
  assert.ok(signature.length > 50);

  const verified = extension.verifyBoxySignature({
    MESSAGE: 'Boxy Scratch Test',
    SIGNATURE: signature
  });
  assert.equal(verified, true);

  assert.equal(extension.getBountyCeiling(), '999999 BTC');
  assert.equal(extension.isWithinBountyCeiling({ AMOUNT: 0 }), true);
  assert.equal(extension.isWithinBountyCeiling({ AMOUNT: 999999 }), true);
  assert.equal(extension.isWithinBountyCeiling({ AMOUNT: 1000000 }), false);

  assert.equal(extension.isAlpineMemorySafe(), true);
}

/**
 * Runs entire test suite.
 *
 * @returns {void}
 */
function runAllTests() {
  testIndexExecution();
  testCryptoUtils();
  testBoxyWalletKeyAndAddressGeneration();
  testBoxyWalletSigningAndVerification();
  testBoxyWalletUTXOAndTransactions();
  testAlpineResourceGuard();
  testBountyTermsEvaluator();
  testExpiryTracker();
  testOmniBlocksExtension();
  console.log('All Issue #30 verification tests passed successfully.');
}

runAllTests();
