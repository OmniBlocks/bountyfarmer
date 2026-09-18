/**
 * Expiry status breakdown.
 *
 * @typedef {Object} ExpiryStatus
 * @property {boolean} isExpired - True if current time exceeds expiration threshold.
 * @property {number} remainingSeconds - Seconds remaining before expiration.
 * @property {string} createdAtISO - Issue creation timestamp.
 * @property {string} expiresAtISO - Calculated expiration timestamp.
 * @property {number} windowMinutes - Total allowed window duration in minutes.
 */

/**
 * Service for tracking issue expiry and submission time limits.
 */
export class ExpiryTracker {
  /**
   * Initializes expiry tracker.
   *
   * @param {string|Date} createdAt - Issue creation timestamp.
   * @param {number} [windowMinutes=1440] - Expiry threshold duration in minutes (default 24 hours).
   */
  constructor(createdAt, windowMinutes = 1440) {
    this.createdAt = new Date(createdAt);
    this.windowMinutes = windowMinutes;
    this.expiresAt = new Date(this.createdAt.getTime() + windowMinutes * 60 * 1000);
  }

  /**
   * Calculates current expiry metrics.
   *
   * @param {string|Date} [referenceTime] - Optional reference time for testing.
   * @returns {ExpiryStatus} Detailed breakdown of expiry metrics.
   */
  checkExpiry(referenceTime) {
    const now = referenceTime ? new Date(referenceTime) : new Date();
    const diffMs = this.expiresAt.getTime() - now.getTime();
    const remainingSeconds = Math.floor(diffMs / 1000);

    return {
      isExpired: remainingSeconds <= 0,
      remainingSeconds,
      createdAtISO: this.createdAt.toISOString(),
      expiresAtISO: this.expiresAt.toISOString(),
      windowMinutes: this.windowMinutes
    };
  }

  /**
   * Evaluates if an operation attempted at a given time is within the eligible window.
   *
   * @param {string|Date} timestamp - Time of action.
   * @returns {boolean} True if action occurred prior to expiration.
   */
  isEligible(timestamp) {
    const checkTime = new Date(timestamp);
    return checkTime <= this.expiresAt;
  }
}
