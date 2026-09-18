const NOMINAL_CEILING_BTC = 999999n;
const NOTE_STIPULATION_BTC = 0n;
const SATOSHIS_PER_BTC = 100000000n;

/**
 * Payout terms evaluator for issue 30 stipulations.
 */
export class BountyTermsEvaluator {
  /**
   * Initializes the terms evaluator.
   *
   * @param {bigint|number|string} [ceilingBTC=NOMINAL_CEILING_BTC] - Statutory nominal ceiling.
   * @param {bigint|number|string} [noteBountyBTC=NOTE_STIPULATION_BTC] - Explicit note stipulation.
   */
  constructor(ceilingBTC = NOMINAL_CEILING_BTC, noteBountyBTC = NOTE_STIPULATION_BTC) {
    this.nominalCeilingBTC = BigInt(ceilingBTC);
    this.noteBountyBTC = BigInt(noteBountyBTC);
  }

  /**
   * Returns statutory maximum nominal bounty in BTC.
   *
   * @returns {bigint} Nominal ceiling in BTC.
   */
  getNominalCeilingBTC() {
    return this.nominalCeilingBTC;
  }

  /**
   * Returns statutory maximum nominal bounty in satoshis.
   *
   * @returns {bigint} Nominal ceiling in satoshis.
   */
  getNominalCeilingSatoshis() {
    return this.nominalCeilingBTC * SATOSHIS_PER_BTC;
  }

  /**
   * Returns explicit footnote stipulation bounty in BTC.
   *
   * @returns {bigint} Footnote bounty in BTC.
   */
  getNoteBountyBTC() {
    return this.noteBountyBTC;
  }

  /**
   * Returns explicit footnote stipulation bounty in satoshis.
   *
   * @returns {bigint} Footnote bounty in satoshis.
   */
  getNoteBountySatoshis() {
    return this.noteBountyBTC * SATOSHIS_PER_BTC;
  }

  /**
   * Evaluates if a specified BTC amount complies with the upper bound.
   *
   * @param {bigint|number|string} amountBTC - Amount to verify.
   * @returns {boolean} True if 0 <= amount <= nominal ceiling.
   */
  isWithinUpToLimit(amountBTC) {
    const value = BigInt(amountBTC);
    return value >= 0n && value <= this.nominalCeilingBTC;
  }

  /**
   * Conducts formal legal and arithmetic assessment of proposed bounty payout.
   *
   * @param {bigint|number|string} [settlementBTC=0n] - Actual settlement amount.
   * @returns {{
   *   isCompliant: boolean,
   *   nominalCeilingBTC: string,
   *   nominalCeilingSatoshis: string,
   *   noteStipulationBTC: string,
   *   actualSettlementBTC: string,
   *   actualSettlementSatoshis: string,
   *   isZeroSettlementValid: boolean,
   *   stipulationLegalAnalysis: string
   * }} Compliance assessment record.
   */
  evaluatePayout(settlementBTC = 0n) {
    const settlementValue = BigInt(settlementBTC);
    const compliant = this.isWithinUpToLimit(settlementValue);
    const isZeroValid = settlementValue === this.noteBountyBTC;

    return {
      isCompliant: compliant,
      nominalCeilingBTC: `${this.nominalCeilingBTC.toString()} BTC`,
      nominalCeilingSatoshis: `${(this.nominalCeilingBTC * SATOSHIS_PER_BTC).toString()} satoshis`,
      noteStipulationBTC: `${this.noteBountyBTC.toString()} BTC`,
      actualSettlementBTC: `${settlementValue.toString()} BTC`,
      actualSettlementSatoshis: `${(settlementValue * SATOSHIS_PER_BTC).toString()} satoshis`,
      isZeroSettlementValid: isZeroValid,
      stipulationLegalAnalysis: 'The phrase "up to 999999 bitcoin" establishes an open upper bound [0, 999999]. The explicit note "the bounty is 0 bitcoin" fixes the exact consideration at 0 BTC. A zero-value settlement perfectly satisfies both the bounded interval and the specific contractual footnote.'
    };
  }

  /**
   * Converts satoshis to estimated fiat value.
   *
   * @param {bigint|number|string} satoshis - Satoshis count.
   * @param {string} [currency='USD'] - Target fiat currency.
   * @param {number} [btcPriceUSD=65000] - BTC price in USD.
   * @returns {number} Estimated fiat value.
   */
  convertSatoshisToFiat(satoshis, currency = 'USD', btcPriceUSD = 65000) {
    const satBigInt = BigInt(satoshis);
    const btcFloat = Number(satBigInt) / 100000000;
    const usdValue = btcFloat * btcPriceUSD;

    const ratesToUSD = {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.77,
      ZWL: 320000.0
    };

    const rate = ratesToUSD[currency.toUpperCase()] ?? 1.0;
    return usdValue * rate;
  }
}
