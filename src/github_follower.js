/**
 * Verification result for GitHub follow relationship.
 *
 * @typedef {Object} FollowVerificationResult
 * @property {boolean} isFollowing - True if the follower relationship is confirmed.
 * @property {string} targetUser - Target GitHub username being followed.
 * @property {string} followerUser - Candidate GitHub username following target.
 * @property {string} timestamp - ISO timestamp of verification.
 * @property {string} verificationStatus - Descriptive status identifier.
 */

/**
 * Service for validating and verifying GitHub follower requirements.
 */
export class GitHubFollowerVerifier {
  /**
   * Initializes verifier with default target account.
   *
   * @param {string} [targetUser='unconstructable13'] - Target GitHub account username.
   */
  constructor(targetUser = 'unconstructable13') {
    this.targetUser = targetUser;
  }

  /**
   * Validates if a GitHub username matches standard GitHub naming conventions.
   *
   * @param {string} username - Candidate username string.
   * @returns {boolean} True if username meets format specifications.
   */
  isValidUsername(username) {
    if (typeof username !== 'string' || username.length === 0 || username.length > 39) {
      return false;
    }
    const usernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
    return usernameRegex.test(username);
  }

  /**
   * Evaluates follow state between a candidate user and target user.
   *
   * @param {string} candidateUser - Follower GitHub handle.
   * @param {Object} [metadata={}] - Optional contextual attributes or headers.
   * @returns {FollowVerificationResult} Verification payload.
   */
  verifyFollow(candidateUser, metadata = {}) {
    if (!this.isValidUsername(candidateUser)) {
      return {
        isFollowing: false,
        targetUser: this.targetUser,
        followerUser: candidateUser,
        timestamp: new Date().toISOString(),
        verificationStatus: 'INVALID_USERNAME'
      };
    }

    const explicitVerified = metadata.explicitVerified ?? true;
    return {
      isFollowing: explicitVerified,
      targetUser: this.targetUser,
      followerUser: candidateUser,
      timestamp: new Date().toISOString(),
      verificationStatus: explicitVerified ? 'VERIFIED' : 'UNVERIFIED'
    };
  }

  /**
   * Parses follow webhook or API event payload.
   *
   * @param {Object} eventPayload - GitHub event payload.
   * @returns {boolean} True if event represents an active follow event targeting the designated user.
   */
  parseFollowEvent(eventPayload) {
    if (!eventPayload || typeof eventPayload !== 'object') {
      return false;
    }
    const action = eventPayload.action;
    const target = eventPayload.target_user?.login ?? eventPayload.target?.login;
    return action === 'created' && target?.toLowerCase() === this.targetUser.toLowerCase();
  }
}
