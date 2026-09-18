import crypto from 'crypto';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32_GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

/**
 * Computes single SHA-256 digest.
 *
 * @param {Buffer|Uint8Array|string} buffer - Input data.
 * @returns {Buffer} 32-byte digest buffer.
 */
export function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

/**
 * Computes single RIPEMD-160 digest.
 *
 * @param {Buffer|Uint8Array|string} buffer - Input data.
 * @returns {Buffer} 20-byte digest buffer.
 */
export function ripemd160(buffer) {
  return crypto.createHash('ripemd160').update(buffer).digest();
}

/**
 * Computes standard Bitcoin double-SHA256 digest.
 *
 * @param {Buffer|Uint8Array|string} buffer - Input data.
 * @returns {Buffer} 32-byte digest buffer.
 */
export function hash256(buffer) {
  return sha256(sha256(buffer));
}

/**
 * Computes standard Bitcoin HASH160 digest (RIPEMD-160 of SHA-256).
 *
 * @param {Buffer|Uint8Array|string} buffer - Input data.
 * @returns {Buffer} 20-byte digest buffer.
 */
export function hash160(buffer) {
  return ripemd160(sha256(buffer));
}

/**
 * Encodes binary buffer into Base58 string representation.
 *
 * @param {Buffer} buffer - Binary payload.
 * @returns {string} Base58 encoded string.
 */
export function base58Encode(buffer) {
  let leadingZeroes = 0;
  while (leadingZeroes < buffer.length && buffer[leadingZeroes] === 0) {
    leadingZeroes++;
  }

  let value = 0n;
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8n) + BigInt(buffer[i]);
  }

  let result = '';
  while (value > 0n) {
    const remainder = Number(value % 58n);
    value = value / 58n;
    result = BASE58_ALPHABET[remainder] + result;
  }

  return '1'.repeat(leadingZeroes) + result;
}

/**
 * Decodes Base58 string into binary buffer.
 *
 * @param {string} string_ - Base58 encoded string.
 * @returns {Buffer} Decoded binary buffer.
 */
export function base58Decode(string_) {
  let leadingZeroes = 0;
  while (leadingZeroes < string_.length && string_[leadingZeroes] === '1') {
    leadingZeroes++;
  }

  let value = 0n;
  for (let i = 0; i < string_.length; i++) {
    const index = BASE58_ALPHABET.indexOf(string_[i]);
    if (index === -1) {
      throw new Error(`Invalid Base58 character: ${string_[i]}`);
    }
    value = value * 58n + BigInt(index);
  }

  const bytes = [];
  while (value > 0n) {
    bytes.unshift(Number(value & 0xffn));
    value = value >> 8n;
  }

  const leadingZeroBytes = Buffer.alloc(leadingZeroes, 0);
  return Buffer.concat([leadingZeroBytes, Buffer.from(bytes)]);
}

/**
 * Encodes payload with 1-byte version prefix and 4-byte double-SHA256 checksum.
 *
 * @param {number} versionByte - Single byte version identifier.
 * @returns {string} Base58Check encoded string.
 */
export function base58CheckEncode(versionByte, payload) {
  const versionBuffer = Buffer.from([versionByte]);
  const combined = Buffer.concat([versionBuffer, payload]);
  const checksum = hash256(combined).subarray(0, 4);
  return base58Encode(Buffer.concat([combined, checksum]));
}

/**
 * Decodes and verifies Base58Check string.
 *
 * @param {string} string_ - Base58Check encoded string.
 * @returns {{ version: number, payload: Buffer }} Decoded version and payload.
 */
export function base58CheckDecode(string_) {
  const decoded = base58Decode(string_);
  if (decoded.length < 5) {
    throw new Error('Base58Check payload too short');
  }

  const version = decoded[0];
  const payload = decoded.subarray(1, decoded.length - 4);
  const actualChecksum = decoded.subarray(decoded.length - 4);
  const expectedChecksum = hash256(decoded.subarray(0, decoded.length - 4)).subarray(0, 4);

  if (!actualChecksum.equals(expectedChecksum)) {
    throw new Error('Base58Check checksum mismatch');
  }

  return { version, payload };
}

/**
 * Computes Bech32 checksum polymod.
 *
 * @param {number[]} values - 5-bit integer array.
 * @returns {number} 30-bit polymod integer.
 */
function bech32Polymod(values) {
  let checksum = 1;
  for (const value of values) {
    const top = checksum >> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) {
        checksum ^= BECH32_GENERATOR[i];
      }
    }
  }
  return checksum;
}

/**
 * Expands human-readable part into 5-bit values for checksumming.
 *
 * @param {string} hrp - Human-readable part string.
 * @returns {number[]} Expanded array.
 */
function bech32HrpExpand(hrp) {
  const result = [];
  for (let i = 0; i < hrp.length; i++) {
    result.push(hrp.charCodeAt(i) >> 5);
  }
  result.push(0);
  for (let i = 0; i < hrp.length; i++) {
    result.push(hrp.charCodeAt(i) & 31);
  }
  return result;
}

/**
 * Computes 6-word Bech32 checksum.
 *
 * @param {string} hrp - Human-readable prefix.
 * @param {number[]} data - 5-bit data words.
 * @returns {number[]} 6 checksum values.
 */
function createBech32Checksum(hrp, data) {
  const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const mod = bech32Polymod(values) ^ 1;
  const result = [];
  for (let p = 0; p < 6; p++) {
    result.push((mod >> (5 * (5 - p))) & 31);
  }
  return result;
}

/**
 * Converts array of bits between arbitrary bit-widths.
 *
 * @param {Buffer|number[]} data - Input bytes or words.
 * @param {number} fromBits - Source bit-width.
 * @param {number} toBits - Destination bit-width.
 * @param {boolean} pad - Whether to pad remaining bits.
 * @returns {number[]} Converted words array.
 */
export function convertBits(data, fromBits, toBits, pad = true) {
  let accumulator = 0;
  let bits = 0;
  const result = [];
  const maxv = (1 << toBits) - 1;

  for (const value of data) {
    if (value < 0 || (value >> fromBits) !== 0) {
      throw new Error('Invalid value in bit conversion');
    }
    accumulator = (accumulator << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((accumulator >> bits) & maxv);
    }
  }

  if (pad) {
    if (bits > 0) {
      result.push((accumulator << (toBits - bits)) & maxv);
    }
  } else if (bits >= fromBits || ((accumulator << (toBits - bits)) & maxv)) {
    throw new Error('Invalid padding in bit conversion');
  }

  return result;
}

/**
 * Encodes data into Bech32 address string.
 *
 * @param {string} hrp - Human-readable prefix.
 * @param {number[]} dataWords - 5-bit data words array.
 * @returns {string} Bech32 encoded string.
 */
export function encodeBech32(hrp, dataWords) {
  const checksum = createBech32Checksum(hrp, dataWords);
  const combined = dataWords.concat(checksum);
  let result = hrp.toLowerCase() + '1';
  for (const value of combined) {
    result += BECH32_CHARSET.charAt(value);
  }
  return result;
}

/**
 * Compresses a 65-byte uncompressed secp256k1 public key into 33-byte format.
 *
 * @param {Buffer} uncompressedKey - 65-byte buffer starting with 0x04.
 * @returns {Buffer} 33-byte compressed public key buffer.
 */
export function compressPublicKey(uncompressedKey) {
  if (uncompressedKey.length === 33) {
    return uncompressedKey;
  }
  if (uncompressedKey.length !== 65 || uncompressedKey[0] !== 0x04) {
    throw new Error('Invalid uncompressed secp256k1 public key format');
  }

  const xCoordinate = uncompressedKey.subarray(1, 33);
  const yCoordinateLastByte = uncompressedKey[64];
  const prefix = yCoordinateLastByte % 2 === 0 ? 0x02 : 0x03;

  return Buffer.concat([Buffer.from([prefix]), xCoordinate]);
}

/**
 * Computes modular exponentiation for BigInt.
 *
 * @param {bigint} base - Base number.
 * @param {bigint} exponent - Exponent.
 * @param {bigint} modulus - Modulus.
 * @returns {bigint} Modular power result.
 */
function modPow(base, exponent, modulus) {
  let result = 1n;
  let b = base % modulus;
  let exp = exponent;
  while (exp > 0n) {
    if (exp % 2n === 1n) {
      result = (result * b) % modulus;
    }
    b = (b * b) % modulus;
    exp = exp / 2n;
  }
  return result;
}

/**
 * Decompresses a 33-byte compressed secp256k1 public key into 65-byte format.
 *
 * @param {Buffer} compressedKey - 33-byte or 65-byte public key buffer.
 * @returns {Buffer} 65-byte uncompressed public key buffer starting with 0x04.
 */
export function decompressPublicKey(compressedKey) {
  if (compressedKey.length === 65 && compressedKey[0] === 0x04) {
    return compressedKey;
  }
  if (compressedKey.length !== 33 || (compressedKey[0] !== 0x02 && compressedKey[0] !== 0x03)) {
    throw new Error('Invalid compressed secp256k1 public key format');
  }

  const SECP256K1_P = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2Fn;
  const prefix = compressedKey[0];
  const x = BigInt('0x' + compressedKey.subarray(1, 33).toString('hex'));
  const ySquared = (modPow(x, 3n, SECP256K1_P) + 7n) % SECP256K1_P;
  let y = modPow(ySquared, (SECP256K1_P + 1n) / 4n, SECP256K1_P);
  const isEven = y % 2n === 0n;

  if ((prefix === 0x02 && !isEven) || (prefix === 0x03 && isEven)) {
    y = (SECP256K1_P - y) % SECP256K1_P;
  }

  const xBuffer = Buffer.from(x.toString(16).padStart(64, '0'), 'hex');
  const yBuffer = Buffer.from(y.toString(16).padStart(64, '0'), 'hex');

  return Buffer.concat([Buffer.from([0x04]), xBuffer, yBuffer]);
}

/**
 * Derives Legacy P2PKH Bitcoin address from public key buffer.
 *
 * @param {Buffer} publicKey - Public key buffer (compressed or uncompressed).
 * @param {string} network - 'mainnet' or 'testnet'.
 * @returns {string} Base58Check encoded P2PKH address.
 */
export function deriveP2PKHAddress(publicKey, network = 'mainnet') {
  const compressedKey = compressPublicKey(publicKey);
  const keyHash = hash160(compressedKey);
  const versionByte = network === 'mainnet' ? 0x00 : 0x6f;
  return base58CheckEncode(versionByte, keyHash);
}

/**
 * Derives Native SegWit P2WPKH Bech32 address from public key buffer.
 *
 * @param {Buffer} publicKey - Public key buffer.
 * @param {string} network - 'mainnet' or 'testnet'.
 * @returns {string} Bech32 encoded SegWit address.
 */
export function deriveSegWitAddress(publicKey, network = 'mainnet') {
  const compressedKey = compressPublicKey(publicKey);
  const keyHash = hash160(compressedKey);
  const hrp = network === 'mainnet' ? 'bc' : 'tb';
  const witnessVersion = 0;
  const convertedWords = convertBits(keyHash, 8, 5, true);
  const dataWords = [witnessVersion].concat(convertedWords);
  return encodeBech32(hrp, dataWords);
}

/**
 * Encodes a 32-byte private key into Bitcoin Wallet Import Format (WIF).
 *
 * @param {Buffer} privateKey - 32-byte private key.
 * @param {boolean} compressed - Whether corresponding public key is compressed.
 * @param {string} network - 'mainnet' or 'testnet'.
 * @returns {string} WIF encoded string.
 */
export function encodeWIF(privateKey, compressed = true, network = 'mainnet') {
  const versionByte = network === 'mainnet' ? 0x80 : 0xef;
  let payload = privateKey;
  if (compressed) {
    payload = Buffer.concat([privateKey, Buffer.from([0x01])]);
  }
  return base58CheckEncode(versionByte, payload);
}

/**
 * Decodes a WIF string into private key buffer and metadata.
 *
 * @param {string} wif - Wallet Import Format string.
 * @returns {{ privateKey: Buffer, compressed: boolean, network: string }} Decoded key metadata.
 */
export function decodeWIF(wif) {
  const { version, payload } = base58CheckDecode(wif);
  let network = 'mainnet';
  if (version === 0xef) {
    network = 'testnet';
  } else if (version !== 0x80) {
    throw new Error(`Unsupported WIF network version: ${version}`);
  }

  let compressed = false;
  let privateKey = payload;
  if (payload.length === 33 && payload[32] === 0x01) {
    compressed = true;
    privateKey = payload.subarray(0, 32);
  } else if (payload.length !== 32) {
    throw new Error('Invalid WIF payload length');
  }

  return { privateKey, compressed, network };
}
