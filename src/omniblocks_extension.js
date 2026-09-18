import { BackflipSimulator } from './backflip.js';
import { GitHubFollowerVerifier } from './github_follower.js';
import { TermsEvaluator } from './terms_evaluator.js';
import { ExpiryTracker } from './expiry_tracker.js';

/**
 * OmniBlocks extension specification definition.
 *
 * @typedef {Object} ExtensionInfo
 * @property {string} id - Unique extension identifier.
 * @property {string} name - User-facing extension name.
 * @property {string} color1 - Primary block color.
 * @property {string} color2 - Secondary block color.
 * @property {string} color3 - Block border color.
 * @property {Object[]} blocks - Block definitions and specifications.
 */

/**
 * Official OmniBlocks extension for executing backflip maneuvers and verifying bounty stipulations.
 */
export class OmniBlocksBackflipExtension {
  /**
   * Initializes extension with required subservices.
   *
   * @param {Object} [runtime] - Optional OmniBlocks/Scratch runtime instance.
   */
  constructor(runtime) {
    this.runtime = runtime;
    this.simulator = new BackflipSimulator();
    this.followerVerifier = new GitHubFollowerVerifier('unconstructable13');
    this.termsEvaluator = new TermsEvaluator('239398281948585883');
    this.tracker = null;
  }

  /**
   * Retrieves extension metadata and block definitions for OmniBlocks engine registration.
   *
   * @returns {ExtensionInfo} Extension registration payload.
   */
  getInfo() {
    return {
      id: 'omniblocksBackflip',
      name: 'Backflip & Bounty Engine',
      color1: '#7952B3',
      color2: '#613d99',
      color3: '#4d2d7f',
      blocks: [
        {
          opcode: 'executeBackflip',
          blockType: 'command',
          text: 'execute backflip with launch velocity [VELOCITY] and spin [SPIN]',
          arguments: {
            VELOCITY: {
              type: 'number',
              defaultValue: 4.5
            },
            SPIN: {
              type: 'number',
              defaultValue: 392.3
            }
          }
        },
        {
          opcode: 'checkBackflipLanded',
          blockType: 'Boolean',
          text: 'is backflip successfully landed?'
        },
        {
          opcode: 'getPeakHeight',
          blockType: 'reporter',
          text: 'peak jump height (meters)'
        },
        {
          opcode: 'verifyGitHubFollow',
          blockType: 'Boolean',
          text: 'is [USER] following target maintainer?',
          arguments: {
            USER: {
              type: 'string',
              defaultValue: 's6pa1rta3n-lab'
            }
          }
        },
        {
          opcode: 'evaluatePayoutCap',
          blockType: 'reporter',
          text: 'maximum authorized bounty value'
        },
        {
          opcode: 'isWithinUpToLimit',
          blockType: 'Boolean',
          text: 'is offer [AMOUNT] valid under up to terms?',
          arguments: {
            AMOUNT: {
              type: 'number',
              defaultValue: 1000
            }
          }
        }
      ]
    };
  }

  /**
   * Executes backflip simulation command block.
   *
   * @param {Object} args - Block arguments.
   * @param {number} args.VELOCITY - Upward launch velocity.
   * @param {number} args.SPIN - Angular rotational velocity.
   * @returns {boolean} Success status.
   */
  executeBackflip(args) {
    const velocity = Number(args.VELOCITY ?? 4.5);
    const spin = Number(args.SPIN ?? 450.0);
    this.lastResult = this.simulator.simulate(velocity, spin);
    return this.lastResult.successful;
  }

  /**
   * Evaluates whether the last simulated backflip landed safely.
   *
   * @returns {boolean} True if landing within safety tolerance.
   */
  checkBackflipLanded() {
    return this.lastResult ? this.lastResult.successful : false;
  }

  /**
   * Reports the peak height of the most recent flip.
   *
   * @returns {number} Height in meters.
   */
  getPeakHeight() {
    return this.lastResult ? this.lastResult.peakHeightMeters : 0.0;
  }

  /**
   * Verifies if a given user follows the target account.
   *
   * @param {Object} args - Block arguments.
   * @param {string} args.USER - Candidate handle.
   * @returns {boolean} Verification outcome.
   */
  verifyGitHubFollow(args) {
    const user = String(args.USER ?? 's6pa1rta3n-lab');
    const result = this.followerVerifier.verifyFollow(user);
    return result.isFollowing;
  }

  /**
   * Reports the statutory maximum bounty ceiling.
   *
   * @returns {string} Formatted dollar ceiling.
   */
  evaluatePayoutCap() {
    return `$${this.termsEvaluator.getMaxCap().toString()}`;
  }

  /**
   * Verifies if a proposed settlement respects the 'up to' stipulation.
   *
   * @param {Object} args - Block arguments.
   * @param {number|string} args.AMOUNT - Proposed payout.
   * @returns {boolean} Compliance boolean.
   */
  isWithinUpToLimit(args) {
    return this.termsEvaluator.isWithinUpToLimit(args.AMOUNT);
  }
}
