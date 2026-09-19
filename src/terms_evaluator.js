/**
 * Payout settlement report structure.
 *
 * @typedef {Object} PayoutAssessment
 * @property {boolean} isCompliant - True if settlement adheres to 'up to' constraint.
 * @property {string} maxAuthorizedUSD - Maximum theoretical reward cap as formatted string.
 * @property {string} proposedAmount - Proposed payout amount.
 * @property {string} currency - Settlement currency code.
 * @property {string} usdEquivalent - Evaluated value in USD equivalent.
 * @property {string} stipulationSummary - Legal stipulation summary clause.
 */

/**
 * Payout terms, conditions, and variable currency valuation engine.
 */
export class TermsEvaluator {
  /**
   * Initializes terms evaluator with statutory bounty cap.
   *
   * @param {bigint|string|number} [maxCap='239398281948585883'] - Maximum ceiling in nominal USD units.
   */
  constructor(maxCap = '239398281948585883') {
    this.maxCap = BigInt(maxCap);
    this.exchangeRatesToUSD = {
      USD: 1.0,
      EUR: 1.08,
      GBP: 1.29,
      ETH: 2600.0,
      XLM: 0.10,
      ZWL: 0.0000031
    };
  }

  /**
   * Retrieves maximum authorized bounty value.
   *
   * @returns {bigint} Statutory ceiling.
   */
  getMaxCap() {
    return this.maxCap;
  }

  /**
   * Validates if a proposed payout falls within statutory 'up to' limits.
   *
   * @param {bigint|string|number} amount - Proposed payout amount in nominal base units.
   * @returns {boolean} True if amount is within [0, maxCap].
   */
  isWithinUpToLimit(amount) {
    try {
      const parsedAmount = BigInt(amount);
      return parsedAmount >= 0n && parsedAmount <= this.maxCap;
    } catch {
      return false;
    }
  }

  /**
   * Evaluates payout offer against contractual stipulations.
   *
   * @param {bigint|string|number} proposedAmount - Offered reward.
   * @param {string} [currency='USD'] - Currency denomination.
   * @returns {PayoutAssessment} Formal assessment of compliance.
   */
  evaluateOffer(proposedAmount, currency = 'USD') {
    const rate = this.exchangeRatesToUSD[currency.toUpperCase()] ?? 1.0;
    const normalizedAmount = BigInt(proposedAmount);
    const compliant = this.isWithinUpToLimit(normalizedAmount);

    return {
      isCompliant: compliant,
      maxAuthorizedUSD: `$${this.maxCap.toString()}`,
      proposedAmount: normalizedAmount.toString(),
      currency: currency.toUpperCase(),
      usdEquivalent: (Number(normalizedAmount) * rate).toString(),
      stipulationSummary: 'Terms and conditions apply. Payout is defined as up to the nominal ceiling. Zero dollar settlement satisfies legal bounds.'
    };
  }

  /**
   * Converts nominal amount between supported currencies.
   *
   * @param {number} amount - Input amount.
   * @param {string} fromCurrency - Source currency code.
   * @param {string} toCurrency - Destination currency code.
   * @returns {number} Converted value.
   */
  convertCurrency(amount, fromCurrency, toCurrency) {
    const fromRate = this.exchangeRatesToUSD[fromCurrency.toUpperCase()] ?? 1.0;
    const toRate = this.exchangeRatesToUSD[toCurrency.toUpperCase()] ?? 1.0;
    const amountInUSD = amount * fromRate;
    return amountInUSD / toRate;
  }
}
