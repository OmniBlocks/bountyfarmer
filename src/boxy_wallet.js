import crypto from 'crypto';
import {
  compressPublicKey,
  decompressPublicKey,
  deriveP2PKHAddress,
  deriveSegWitAddress,
  encodeWIF,
  decodeWIF,
  hash256
} from './crypto_utils.js';
import { AlpineResourceGuard } from './resource_guard.js';

/**
 * Bitcoin wallet engineered for the Boxy character and boxycpu bot agent.
 */
export class BoxyWallet {
  /**
   * Initializes Boxy's Bitcoin wallet.
   *
   * @param {object} options - Configuration options.
   * @param {string} [options.privateKeyHex] - Optional 32-byte hex private key.
   * @param {string} [options.wif] - Optional Wallet Import Format string.
   * @param {string} [options.network='mainnet'] - Network identifier ('mainnet' or 'testnet').
   * @param {string} [options.label="Boxy's Bitcoin Vault"] - Human readable label.
   * @param {string} [options.owner='boxycpu'] - Bot identity owner.
   */
  constructor(options = {}) {
    this.network = options.network ?? 'mainnet';
    this.label = options.label ?? "Boxy's Bitcoin Vault";
    this.owner = options.owner ?? 'boxycpu';
    this.resourceGuard = new AlpineResourceGuard();

    const keypair = this.#resolveKeyPair(options);
    this.privateKey = keypair.privateKey;
    this.publicKeyUncompressed = keypair.publicKeyUncompressed;
    this.publicKeyCompressed = compressPublicKey(this.publicKeyUncompressed);

    this.addressP2PKH = deriveP2PKHAddress(this.publicKeyCompressed, this.network);
    this.addressSegWit = deriveSegWitAddress(this.publicKeyCompressed, this.network);
    this.wif = encodeWIF(this.privateKey, true, this.network);

    this.utxos = new Map();
    this.txHistory = [];
  }

  /**
   * Resolves private and public keys from options or generates new secp256k1 keypair.
   *
   * @param {object} options - Wallet options.
   * @returns {{ privateKey: Buffer, publicKeyUncompressed: Buffer }} Keypair buffers.
   */
  #resolveKeyPair(options) {
    const ecdh = crypto.createECDH('secp256k1');

    if (options.wif) {
      const decoded = decodeWIF(options.wif);
      this.network = decoded.network;
      ecdh.setPrivateKey(decoded.privateKey);
      return {
        privateKey: decoded.privateKey,
        publicKeyUncompressed: ecdh.getPublicKey()
      };
    }

    if (options.privateKeyHex) {
      const privBuffer = Buffer.from(options.privateKeyHex, 'hex');
      if (privBuffer.length !== 32) {
        throw new Error('Private key must be 32 bytes');
      }
      ecdh.setPrivateKey(privBuffer);
      return {
        privateKey: privBuffer,
        publicKeyUncompressed: ecdh.getPublicKey()
      };
    }

    ecdh.generateKeys();
    return {
      privateKey: ecdh.getPrivateKey(),
      publicKeyUncompressed: ecdh.getPublicKey()
    };
  }

  /**
   * Returns Boxy's Bitcoin addresses.
   *
   * @returns {{ p2pkh: string, segwit: string, network: string }} Address container.
   */
  getAddresses() {
    return {
      p2pkh: this.addressP2PKH,
      segwit: this.addressSegWit,
      network: this.network
    };
  }

  /**
   * Returns private key in WIF format.
   *
   * @returns {string} WIF string.
   */
  getWIF() {
    return this.wif;
  }

  /**
   * Returns raw public key buffer.
   *
   * @param {boolean} compressed - True for 33-byte compressed, false for 65-byte uncompressed.
   * @returns {Buffer} Public key buffer.
   */
  getPublicKey(compressed = true) {
    return compressed ? this.publicKeyCompressed : this.publicKeyUncompressed;
  }

  /**
   * Returns raw 32-byte private key buffer.
   *
   * @returns {Buffer} Private key buffer.
   */
  getPrivateKey() {
    return this.privateKey;
  }

  /**
   * Calculates current wallet balance across all unspent transaction outputs.
   *
   * @returns {{ satoshis: bigint, btc: string }} Balance structure.
   */
  getBalance() {
    let totalSatoshis = 0n;
    for (const utxo of this.utxos.values()) {
      totalSatoshis += BigInt(utxo.satoshis);
    }

    const wholeBtc = totalSatoshis / 100000000n;
    const fractionalSatoshis = totalSatoshis % 100000000n;
    const paddedFraction = fractionalSatoshis.toString().padStart(8, '0');
    const btcString = `${wholeBtc.toString()}.${paddedFraction}`;

    return {
      satoshis: totalSatoshis,
      btc: btcString
    };
  }

  /**
   * Adds an unspent transaction output to Boxy's wallet.
   *
   * @param {object} utxo - UTXO details.
   * @param {string} utxo.txid - Transaction hash.
   * @param {number} utxo.vout - Output index.
   * @param {bigint|number|string} utxo.satoshis - Value in satoshis.
   * @param {string} [utxo.scriptPubKey] - Locking script.
   * @param {number} [utxo.confirmations=1] - Confirmation count.
   * @returns {string} UTXO identifier key.
   */
  addUTXO(utxo) {
    this.resourceGuard.enforceCapacityLimit(this.utxos.size, 'utxo');

    const key = `${utxo.txid}:${utxo.vout}`;
    this.utxos.set(key, {
      txid: utxo.txid,
      vout: utxo.vout,
      satoshis: BigInt(utxo.satoshis),
      scriptPubKey: utxo.scriptPubKey ?? `0014${this.addressSegWit.slice(4)}`,
      confirmations: utxo.confirmations ?? 1
    });

    return key;
  }

  /**
   * Spends and removes an unspent transaction output.
   *
   * @param {string} txid - Transaction hash.
   * @param {number} vout - Output index.
   * @returns {boolean} True if UTXO was found and removed.
   */
  spendUTXO(txid, vout) {
    const key = `${txid}:${vout}`;
    return this.utxos.delete(key);
  }

  /**
   * Signs arbitrary text or binary message using secp256k1 ECDSA.
   *
   * @param {string|Buffer} message - Message to sign.
   * @returns {string} Hexadecimal DER-encoded ECDSA signature.
   */
  signMessage(message) {
    const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(String(message), 'utf-8');
    const xCoord = this.publicKeyUncompressed.subarray(1, 33);
    const yCoord = this.publicKeyUncompressed.subarray(33, 65);

    const jwk = {
      kty: 'EC',
      crv: 'secp256k1',
      d: this.privateKey.toString('base64url'),
      x: xCoord.toString('base64url'),
      y: yCoord.toString('base64url')
    };

    const privateKeyObject = crypto.createPrivateKey({ key: jwk, format: 'jwk' });
    const signature = crypto.sign('sha256', messageBuffer, privateKeyObject);
    return signature.toString('hex');
  }

  /**
   * Verifies an ECDSA signature against message and public key.
   *
   * @param {string|Buffer} message - Original signed message.
   * @param {string} signatureHex - Hexadecimal signature.
   * @param {Buffer} [pubKeyBuffer] - Optional public key buffer (defaults to wallet public key).
   * @returns {boolean} True if signature is valid.
   */
  verifyMessage(message, signatureHex, pubKeyBuffer = null) {
    const messageBuffer = Buffer.isBuffer(message) ? message : Buffer.from(String(message), 'utf-8');
    const targetKey = pubKeyBuffer ?? this.publicKeyCompressed;
    const decompressed = decompressPublicKey(targetKey);

    const xCoord = decompressed.subarray(1, 33);
    const yCoord = decompressed.subarray(33, 65);

    const jwk = {
      kty: 'EC',
      crv: 'secp256k1',
      x: xCoord.toString('base64url'),
      y: yCoord.toString('base64url')
    };

    const publicKeyObject = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const signatureBuffer = Buffer.from(signatureHex, 'hex');

    return crypto.verify('sha256', messageBuffer, publicKeyObject, signatureBuffer);
  }

  /**
   * Constructs and signs an outgoing transaction.
   *
   * @param {object} params - Transaction parameters.
   * @param {string} params.recipientAddress - Destination Bitcoin address.
   * @param {bigint|number|string} params.satoshis - Amount to send in satoshis.
   * @param {bigint|number|string} [params.feeSatoshis=1000n] - Miner fee in satoshis.
   * @returns {object} Completed transaction record.
   */
  createTransaction({ recipientAddress, satoshis, feeSatoshis = 1000n }) {
    if (!recipientAddress || typeof recipientAddress !== 'string') {
      throw new Error('Valid recipient address is required');
    }

    const sendAmount = BigInt(satoshis);
    const feeAmount = BigInt(feeSatoshis);
    const totalRequired = sendAmount + feeAmount;

    let accumulatedSatoshis = 0n;
    const selectedUTXOs = [];

    for (const [key, utxo] of this.utxos.entries()) {
      selectedUTXOs.push({ ...utxo, key });
      accumulatedSatoshis += utxo.satoshis;
      if (accumulatedSatoshis >= totalRequired) {
        break;
      }
    }

    if (accumulatedSatoshis < totalRequired) {
      throw new Error(`Insufficient funds: required ${totalRequired} satoshis, available ${accumulatedSatoshis}`);
    }

    for (const utxo of selectedUTXOs) {
      this.utxos.delete(utxo.key);
    }

    const changeSatoshis = accumulatedSatoshis - totalRequired;
    const inputs = selectedUTXOs.map((u) => ({
      txid: u.txid,
      vout: u.vout,
      satoshis: u.satoshis
    }));

    const outputs = [
      {
        address: recipientAddress,
        satoshis: sendAmount
      }
    ];

    if (changeSatoshis > 0n) {
      outputs.push({
        address: this.addressSegWit,
        satoshis: changeSatoshis
      });
    }

    const serializablePayload = {
      inputs: inputs.map((i) => ({ ...i, satoshis: i.satoshis.toString() })),
      outputs: outputs.map((o) => ({ ...o, satoshis: o.satoshis.toString() })),
      fee: feeAmount.toString()
    };
    const txSerializedString = JSON.stringify(serializablePayload);
    const txid = hash256(Buffer.from(txSerializedString)).toString('hex');

    if (changeSatoshis > 0n) {
      this.addUTXO({
        txid,
        vout: 1,
        satoshis: changeSatoshis,
        confirmations: 1
      });
    }

    this.resourceGuard.enforceCapacityLimit(this.txHistory.length, 'history');

    const txRecord = {
      txid,
      inputs,
      outputs,
      feeSatoshis: feeAmount,
      totalSpentSatoshis: totalRequired,
      timestamp: new Date().toISOString()
    };

    this.txHistory.push(txRecord);
    return txRecord;
  }

  /**
   * Returns operational diagnostics and telemetry for Boxy.
   *
   * @returns {object} Telemetry report.
   */
  getTelemetry() {
    const memory = this.resourceGuard.getMemorySnapshot();
    const balance = this.getBalance();

    return {
      owner: this.owner,
      label: this.label,
      network: this.network,
      p2pkhAddress: this.addressP2PKH,
      segwitAddress: this.addressSegWit,
      utxoCount: this.utxos.size,
      txCount: this.txHistory.length,
      balanceSatoshis: balance.satoshis.toString(),
      balanceBTC: balance.btc,
      alpineMemoryBudgetUtilization: `${memory.budgetUtilizationPercent}%`,
      alpineSafeStatus: memory.isWithinBudget && memory.isHeapSafe
    };
  }
}
