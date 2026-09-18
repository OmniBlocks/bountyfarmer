import { BackflipSimulator } from './src/backflip.js';
import { GitHubFollowerVerifier } from './src/github_follower.js';
import { TermsEvaluator } from './src/terms_evaluator.js';
import { ExpiryTracker } from './src/expiry_tracker.js';
import { OmniBlocksBackflipExtension } from './src/omniblocks_extension.js';

/**
 * Main application runner for bountyfarmer issue 31.
 * Outputs Hello, World! and executes the backflip kinematics verification.
 *
 * @returns {void}
 */
export function main() {
  console.log('Hello, World!');

  const simulator = new BackflipSimulator();
  const trajectoryResult = simulator.simulate();
  console.log(`Backflip Execution: ${trajectoryResult.successful ? 'SUCCESSFUL' : 'FAILED'}`);
  console.log(`Peak Height: ${trajectoryResult.peakHeightMeters}m | Total Rotation: ${trajectoryResult.finalRotationDegrees} deg`);

  const verifier = new GitHubFollowerVerifier('unconstructable13');
  const followCheck = verifier.verifyFollow('s6pa1rta3n-lab');
  console.log(`Follow Status (unconstructable13): ${followCheck.verificationStatus}`);

  const terms = new TermsEvaluator('239398281948585883');
  const assessment = terms.evaluateOffer('239398281948585883', 'USD');
  console.log(`Max Bounty Cap: ${assessment.maxAuthorizedUSD}`);
}

main();

export {
  BackflipSimulator,
  GitHubFollowerVerifier,
  TermsEvaluator,
  ExpiryTracker,
  OmniBlocksBackflipExtension
};
