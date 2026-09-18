import { BoxyWallet } from './boxy_wallet.js';
import { BountyTermsEvaluator } from './bounty_terms_evaluator.js';
import { AlpineResourceGuard } from './resource_guard.js';

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
 * OmniBlocks extension integrating Boxy's Bitcoin wallet and bounty evaluation.
 */
export class OmniBlocksBoxyBitcoinExtension {
  /**
   * Initializes extension with required services.
   *
   * @param {Object} [runtime] - Optional OmniBlocks runtime instance.
   */
  constructor(runtime) {
    this.runtime = runtime;
    this.wallet = new BoxyWallet();
    this.termsEvaluator = new BountyTermsEvaluator();
    this.resourceGuard = new AlpineResourceGuard();
  }

  /**
   * Retrieves extension metadata and block definitions for OmniBlocks engine registration.
   *
   * @returns {ExtensionInfo} Extension registration payload.
   */
  getInfo() {
    return {
      id: 'omniblocksBoxyBitcoin',
      name: 'Boxy Bitcoin Wallet',
      color1: '#F7931A',
      color2: '#E07A06',
      color3: '#B56100',
      blocks: [
        {
          opcode: 'getBoxyAddress',
          blockType: 'reporter',
          text: 'boxy [TYPE] bitcoin address',
          arguments: {
            TYPE: {
              type: 'string',
              menu: 'addressTypeMenu',
              defaultValue: 'segwit'
            }
          }
        },
        {
          opcode: 'getBoxyBalance',
          blockType: 'reporter',
          text: 'boxy wallet balance (satoshis)'
        },
        {
          opcode: 'signBoxyMessage',
          blockType: 'reporter',
          text: 'sign message [MESSAGE] with boxy wallet',
          arguments: {
            MESSAGE: {
              type: 'string',
              defaultValue: 'Hello Boxy'
            }
          }
        },
        {
          opcode: 'verifyBoxySignature',
          blockType: 'Boolean',
          text: 'is signature [SIGNATURE] valid for message [MESSAGE]?',
          arguments: {
            SIGNATURE: {
              type: 'string',
              defaultValue: ''
            },
            MESSAGE: {
              type: 'string',
              defaultValue: 'Hello Boxy'
            }
          }
        },
        {
          opcode: 'getBountyCeiling',
          blockType: 'reporter',
          text: 'bounty statutory ceiling'
        },
        {
          opcode: 'isWithinBountyCeiling',
          blockType: 'Boolean',
          text: 'is payout [AMOUNT] BTC within statutory ceiling?',
          arguments: {
            AMOUNT: {
              type: 'number',
              defaultValue: 0
            }
          }
        },
        {
          opcode: 'isAlpineMemorySafe',
          blockType: 'Boolean',
          text: 'is alpine 1.9GB memory budget safe?'
        }
      ],
      menus: {
        addressTypeMenu: {
          acceptReporters: true,
          items: ['segwit', 'p2pkh']
        }
      }
    };
  }

  /**
   * Reports Boxy's Bitcoin address by format.
   *
   * @param {Object} args - Block arguments.
   * @param {string} args.TYPE - 'segwit' or 'p2pkh'.
   * @returns {string} Address string.
   */
  getBoxyAddress(args) {
    const type = String(args.TYPE ?? 'segwit').toLowerCase();
    const addresses = this.wallet.getAddresses();
    return type === 'p2pkh' ? addresses.p2pkh : addresses.segwit;
  }

  /**
   * Reports wallet balance in satoshis.
   *
   * @returns {number} Satoshis balance.
   */
  getBoxyBalance() {
    const balance = this.wallet.getBalance();
    return Number(balance.satoshis);
  }

  /**
   * Signs a message using Boxy's wallet.
   *
   * @param {Object} args - Block arguments.
   * @param {string} args.MESSAGE - Text payload.
   * @returns {string} Hex signature.
   */
  signBoxyMessage(args) {
    const message = String(args.MESSAGE ?? '');
    return this.wallet.signMessage(message);
  }

  /**
   * Verifies an ECDSA signature.
   *
   * @param {Object} args - Block arguments.
   * @param {string} args.MESSAGE - Text payload.
   * @param {string} args.SIGNATURE - Hex signature.
   * @returns {boolean} True if verified.
   */
  verifyBoxySignature(args) {
    const message = String(args.MESSAGE ?? '');
    const signature = String(args.SIGNATURE ?? '');
    return this.wallet.verifyMessage(message, signature);
  }

  /**
   * Reports the statutory maximum nominal bounty in BTC.
   *
   * @returns {string} Formatted BTC ceiling string.
   */
  getBountyCeiling() {
    return `${this.termsEvaluator.getNominalCeilingBTC().toString()} BTC`;
  }

  /**
   * Verifies if an amount in BTC respects the upper bound.
   *
   * @param {Object} args - Block arguments.
   * @param {number|string} args.AMOUNT - Proposed amount in BTC.
   * @returns {boolean} True if within bound.
   */
  isWithinBountyCeiling(args) {
    return this.termsEvaluator.isWithinUpToLimit(args.AMOUNT);
  }

  /**
   * Verifies if memory utilization respects Alpine Linux VM 1.9GB budget.
   *
   * @returns {boolean} True if safe.
   */
  isAlpineMemorySafe() {
    const snapshot = this.resourceGuard.getMemorySnapshot();
    return snapshot.isWithinBudget && snapshot.isHeapSafe;
  }
}
