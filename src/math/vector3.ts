import { Vector3D } from '../types';

/**
 * Creates a three-dimensional vector.
 *
 * @param x - The X coordinate.
 * @param y - The Y coordinate.
 * @param z - The Z coordinate.
 * @returns A newly created Vector3D.
 */
export function createVector3(x = 0, y = 0, z = 0): Vector3D {
  return { x, y, z };
}

/**
 * Computes the vector sum of two three-dimensional vectors.
 *
 * @param a - First vector operand.
 * @param b - Second vector operand.
 * @returns The resulting sum vector.
 */
export function addVectors(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z
  };
}

/**
 * Computes the vector difference between two three-dimensional vectors.
 *
 * @param a - Vector to subtract from.
 * @param b - Vector to subtract.
 * @returns The resulting difference vector.
 */
export function subVectors(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z
  };
}

/**
 * Scales a three-dimensional vector by a scalar factor.
 *
 * @param v - Vector to scale.
 * @param scalar - Multiplicative scalar.
 * @returns The scaled vector.
 */
export function scaleVector(v: Vector3D, scalar: number): Vector3D {
  return {
    x: v.x * scalar,
    y: v.y * scalar,
    z: v.z * scalar
  };
}

/**
 * Computes the dot product of two three-dimensional vectors.
 *
 * @param a - First vector.
 * @param b - Second vector.
 * @returns The scalar dot product.
 */
export function dotVectors(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Computes the cross product of two three-dimensional vectors.
 *
 * @param a - First vector.
 * @param b - Second vector.
 * @returns The perpendicular cross product vector.
 */
export function crossVectors(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

/**
 * Computes the squared magnitude of a vector.
 *
 * @param v - Input vector.
 * @returns The squared magnitude scalar.
 */
export function vectorMagnitudeSquared(v: Vector3D): number {
  return v.x * v.x + v.y * v.y + v.z * v.z;
}

/**
 * Computes the Euclidean magnitude of a vector.
 *
 * @param v - Input vector.
 * @returns The Euclidean length scalar.
 */
export function vectorMagnitude(v: Vector3D): number {
  return Math.sqrt(vectorMagnitudeSquared(v));
}

/**
 * Normalizes a three-dimensional vector to unit length.
 *
 * @param v - Input vector.
 * @returns The normalized unit vector, or a zero vector if magnitude is zero.
 */
export function normalizeVector(v: Vector3D): Vector3D {
  const mag = vectorMagnitude(v);
  if (mag === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return scaleVector(v, 1 / mag);
}

/**
 * Computes the squared Euclidean distance between two points in 3D space.
 *
 * @param a - First point.
 * @param b - Second point.
 * @returns The squared Euclidean distance.
 */
export function distanceBetweenSquared(a: Vector3D, b: Vector3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Computes the Euclidean distance between two points in 3D space.
 *
 * @param a - First point.
 * @param b - Second point.
 * @returns The Euclidean distance.
 */
export function distanceBetween(a: Vector3D, b: Vector3D): number {
  return Math.sqrt(distanceBetweenSquared(a, b));
}
