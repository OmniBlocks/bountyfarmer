import { execSync } from 'child_process';
import { strict as assert } from 'assert';
import { BackflipSimulator } from '../src/backflip.js';
import { GitHubFollowerVerifier } from '../src/github_follower.js';
import { TermsEvaluator } from '../src/terms_evaluator.js';
import { ExpiryTracker } from '../src/expiry_tracker.js';
import { OmniBlocksBackflipExtension } from '../src/omniblocks_extension.js';

/**
 * Executes verification of index.js execution and console output.
 *
 * @returns {void}
 */
function testIndexExecution() {
  const output = execSync('node index.js', { encoding: 'utf-8' });
  assert.ok(output.includes('Hello, World!'), 'Expected Hello, World! in output');
  assert.ok(output.includes('Backflip Execution: SUCCESSFUL'), 'Expected backflip execution success');
  assert.ok(output.includes('unconstructable13'), 'Expected target maintainer handle in output');
  assert.ok(output.includes('$239398281948585883'), 'Expected statutory cap in output');
}

/**
 * Executes verification of backflip kinematics and physics simulation.
 *
 * @returns {void}
 */
function testBackflipKinematics() {
  const simulator = new BackflipSimulator();
  const theoreticalTime = simulator.calculateFlightTime(4.5);
  assert.ok(theoreticalTime > 0.9 && theoreticalTime < 0.93, 'Flight time outside expected physical range');

  const peakHeight = simulator.calculatePeakHeight(4.5);
  assert.ok(peakHeight > 1.0 && peakHeight < 1.05, 'Peak height outside expected physical range');

  const successResult = simulator.simulate(4.5, 392.3);
  assert.equal(successResult.successful, true, 'Nominal backflip should succeed');
  assert.ok(successResult.peakHeightMeters >= 0.5, 'Minimum jump clearance failed');
  assert.ok(successResult.landingAngleErrorDegrees <= 25.0, 'Landing angle exceeded tolerance');

  const failResult = simulator.simulate(4.5, 100.0);
  assert.equal(failResult.successful, false, 'Under-rotated flip should fail');

  const lowJumpResult = simulator.simulate(1.0, 392.3);
  assert.equal(lowJumpResult.successful, false, 'Insufficient jump height should fail');
}

/**
 * Executes verification of GitHub follower validation service.
 *
 * @returns {void}
 */
function testGitHubFollowerVerification() {
  const verifier = new GitHubFollowerVerifier('unconstructable13');

  assert.equal(verifier.isValidUsername('unconstructable13'), true);
  assert.equal(verifier.isValidUsername('s6pa1rta3n-lab'), true);
  assert.equal(verifier.isValidUsername('invalid--username'), false);
  assert.equal(verifier.isValidUsername(''), false);

  const verifiedCheck = verifier.verifyFollow('s6pa1rta3n-lab', { explicitVerified: true });
  assert.equal(verifiedCheck.isFollowing, true);
  assert.equal(verifiedCheck.targetUser, 'unconstructable13');
  assert.equal(verifiedCheck.verificationStatus, 'VERIFIED');

  const unverifiedCheck = verifier.verifyFollow('s6pa1rta3n-lab', { explicitVerified: false });
  assert.equal(unverifiedCheck.isFollowing, false);
  assert.equal(unverifiedCheck.verificationStatus, 'UNVERIFIED');

  const validEvent = {
    action: 'created',
    target_user: { login: 'unconstructable13' }
  };
  assert.equal(verifier.parseFollowEvent(validEvent), true);

  const invalidEvent = {
    action: 'deleted',
    target_user: { login: 'unconstructable13' }
  };
  assert.equal(verifier.parseFollowEvent(invalidEvent), false);
}

/**
 * Executes verification of terms and variable currency calculations.
 *
 * @returns {void}
 */
function testTermsEvaluator() {
  const terms = new TermsEvaluator('239398281948585883');
  assert.equal(terms.getMaxCap(), 239398281948585883n);

  assert.equal(terms.isWithinUpToLimit(0), true);
  assert.equal(terms.isWithinUpToLimit(1000), true);
  assert.equal(terms.isWithinUpToLimit('239398281948585883'), true);
  assert.equal(terms.isWithinUpToLimit('239398281948585884'), false);
  assert.equal(terms.isWithinUpToLimit(-1), false);

  const assessment = terms.evaluateOffer('1000', 'USD');
  assert.equal(assessment.isCompliant, true);
  assert.equal(assessment.maxAuthorizedUSD, '$239398281948585883');

  const convertedEUR = terms.convertCurrency(100, 'EUR', 'USD');
  assert.equal(convertedEUR, 108);

  const convertedZWL = terms.convertCurrency(1000000, 'ZWL', 'USD');
  assert.equal(convertedZWL, 3.1);
}

/**
 * Executes verification of bounty expiration tracking.
 *
 * @returns {void}
 */
function testExpiryTracker() {
  const issueCreatedAt = '2026-09-18T03:44:00.000Z';
  const tracker = new ExpiryTracker(issueCreatedAt, 30);

  const earlyTime = '2026-09-18T03:55:00.000Z';
  const earlyCheck = tracker.checkExpiry(earlyTime);
  assert.equal(earlyCheck.isExpired, false);
  assert.ok(earlyCheck.remainingSeconds > 0);
  assert.equal(tracker.isEligible(earlyTime), true);

  const expiredTime = '2026-09-18T04:20:00.000Z';
  const expiredCheck = tracker.checkExpiry(expiredTime);
  assert.equal(expiredCheck.isExpired, true);
  assert.ok(expiredCheck.remainingSeconds < 0);
  assert.equal(tracker.isEligible(expiredTime), false);
}

/**
 * Executes verification of OmniBlocks custom extension specifications and methods.
 *
 * @returns {void}
 */
function testOmniBlocksExtension() {
  const extension = new OmniBlocksBackflipExtension();
  const info = extension.getInfo();

  assert.equal(info.id, 'omniblocksBackflip');
  assert.equal(info.name, 'Backflip & Bounty Engine');
  assert.ok(Array.isArray(info.blocks));
  assert.ok(info.blocks.length >= 6);

  const flipResult = extension.executeBackflip({ VELOCITY: 4.5, SPIN: 392.3 });
  assert.equal(flipResult, true);
  assert.equal(extension.checkBackflipLanded(), true);
  assert.ok(extension.getPeakHeight() > 1.0);

  const verified = extension.verifyGitHubFollow({ USER: 's6pa1rta3n-lab' });
  assert.equal(verified, true);

  const cap = extension.evaluatePayoutCap();
  assert.equal(cap, '$239398281948585883');

  assert.equal(extension.isWithinUpToLimit({ AMOUNT: 500 }), true);
}

/**
 * Root test suite runner.
 *
 * @returns {void}
 */
function runAllTests() {
  testIndexExecution();
  testBackflipKinematics();
  testGitHubFollowerVerification();
  testTermsEvaluator();
  testExpiryTracker();
  testOmniBlocksExtension();
  console.log('All Issue #31 verification tests passed successfully.');
}

runAllTests();
