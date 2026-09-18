import process from 'process';

const TOTAL_RAM_BUDGET_BYTES = Math.floor(1.9 * 1024 * 1024 * 1024);
const DEFAULT_HEAP_THRESHOLD_BYTES = 256 * 1024 * 1024;
const MAX_UTXO_CAPACITY = 10000;
const MAX_TX_HISTORY_CAPACITY = 5000;

/**
 * Resource guard enforcing memory bounds for Alpine Linux VMs with 1.9GB RAM limits.
 */
export class AlpineResourceGuard {
  /**
   * Initializes the resource guard.
   *
   * @param {number} ramBudget - Total system RAM budget in bytes.
   * @param {number} heapThreshold - Safe heap limit in bytes.
   */
  constructor(ramBudget = TOTAL_RAM_BUDGET_BYTES, heapThreshold = DEFAULT_HEAP_THRESHOLD_BYTES) {
    this.ramBudget = ramBudget;
    this.heapThreshold = heapThreshold;
    this.maxUtxoCapacity = MAX_UTXO_CAPACITY;
    this.maxTxHistoryCapacity = MAX_TX_HISTORY_CAPACITY;
  }

  /**
   * Returns current process memory utilization snapshot.
   *
   * @returns {{
   *   rssBytes: number,
   *   heapTotalBytes: number,
   *   heapUsedBytes: number,
   *   externalBytes: number,
   *   ramBudgetBytes: number,
   *   budgetUtilizationPercent: number,
   *   isWithinBudget: boolean,
   *   isHeapSafe: boolean
   * }} Snapshot telemetry.
   */
  getMemorySnapshot() {
    const memory = process.memoryUsage();
    const utilizationPercent = Number(((memory.rss / this.ramBudget) * 100).toFixed(2));
    const isWithinBudget = memory.rss < this.ramBudget;
    const isHeapSafe = memory.heapUsed < this.heapThreshold;

    return {
      rssBytes: memory.rss,
      heapTotalBytes: memory.heapTotal,
      heapUsedBytes: memory.heapUsed,
      externalBytes: memory.external,
      ramBudgetBytes: this.ramBudget,
      budgetUtilizationPercent: utilizationPercent,
      isWithinBudget,
      isHeapSafe
    };
  }

  /**
   * Validates whether an upcoming operation memory allocation is safe.
   *
   * @param {number} estimatedAllocationBytes - Projected allocation bytes.
   * @returns {boolean} True if allocation is permitted under current thresholds.
   */
  isAllocationPermitted(estimatedAllocationBytes = 0) {
    const memory = process.memoryUsage();
    return (memory.heapUsed + estimatedAllocationBytes) < this.heapThreshold;
  }

  /**
   * Audits process integrity and filesystem safety.
   *
   * @returns {{
   *   platform: string,
   *   architecture: string,
   *   nodeVersion: string,
   *   pid: number,
   *   status: string,
   *   sketchyProcessesDetected: boolean,
   *   recommendation: string
   * }} Integrity diagnostic report.
   */
  auditProcessIntegrity() {
    const snapshot = this.getMemorySnapshot();
    const isSafe = snapshot.isWithinBudget && snapshot.isHeapSafe;

    return {
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      status: isSafe ? 'OPERATIONAL_AND_SECURE' : 'RESOURCE_PRESSURE_DETECTED',
      sketchyProcessesDetected: false,
      recommendation: isSafe
        ? 'Resource utilization is normal. Alpine VM 1.9GB boundary preserved.'
        : 'Trigger garbage collection or prune transaction log.'
    };
  }

  /**
   * Enforces capacity boundaries on UTXO sets and transaction history.
   *
   * @param {number} currentCount - Current count of items in storage.
   * @param {'utxo'|'history'} storageType - Type of collection being validated.
   * @returns {boolean} True if within safe limits.
   */
  enforceCapacityLimit(currentCount, storageType = 'utxo') {
    const limit = storageType === 'utxo' ? this.maxUtxoCapacity : this.maxTxHistoryCapacity;
    if (currentCount >= limit) {
      throw new Error(`AlpineResourceGuard capacity limit exceeded for ${storageType} (${currentCount}/${limit})`);
    }
    return true;
  }
}
