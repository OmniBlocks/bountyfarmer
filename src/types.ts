/**
 * Core type definitions for the cosmological simulation engine and OmniBlocks extension.
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type CelestialBodyType =
  | 'supercluster'
  | 'galaxy'
  | 'star'
  | 'planet'
  | 'moon'
  | 'black_hole'
  | 'asteroid'
  | 'nebula';

export type SpectralClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

export type StellarPhase =
  | 'protostar'
  | 'main_sequence'
  | 'red_giant'
  | 'supernova'
  | 'white_dwarf'
  | 'neutron_star'
  | 'black_hole';

export type NucleosynthesisStage =
  | 'hydrogen_fusion'
  | 'helium_fusion'
  | 'carbon_fusion'
  | 'oxygen_fusion'
  | 'silicon_fusion'
  | 'iron_core_collapse';

export interface CelestialBody {
  id: string;
  name: string;
  type: CelestialBodyType;
  mass: number;
  radius: number;
  position: Vector3D;
  velocity: Vector3D;
  acceleration: Vector3D;
  luminosity: number;
  temperature: number;
  ageYears: number;
  spectralClass?: SpectralClass;
  phase?: StellarPhase;
  fusionStage?: NucleosynthesisStage;
  parentId?: string;
}

export interface CosmologicalParameters {
  hubbleConstant: number;
  darkEnergyRatio: number;
  darkMatterRatio: number;
  baryonicMatterRatio: number;
}

export interface CosmologicalState {
  cosmicAgeYears: number;
  scaleFactor: number;
  redshift: number;
  hubbleRate: number;
  cmbTemperatureK: number;
  parameters: CosmologicalParameters;
}

export interface KeplerianOrbit {
  semiMajorAxis: number;
  eccentricity: number;
  orbitalPeriodSeconds: number;
  orbitalVelocityMetersPerSecond: number;
  periapsisMeters: number;
  apoapsisMeters: number;
  escapeVelocityMetersPerSecond: number;
}

export interface HabitableZone {
  innerRadiusMeters: number;
  outerRadiusMeters: number;
  equilibriumTemperatureK: number;
  isHabitable: boolean;
}

export interface RelativisticProperties {
  schwarzschildRadiusMeters: number;
  hawkingTemperatureK: number;
  hawkingLuminosityWatts: number;
  gravitationalTimeDilation: number;
}

export type BlockType = 'command' | 'reporter' | 'Boolean' | 'hat';

export type ArgumentType = 'string' | 'number' | 'Boolean';

export interface BlockArgument {
  type: ArgumentType;
  defaultValue: string | number | boolean;
  menu?: string;
}

export interface BlockMetadata {
  opcode: string;
  blockType: BlockType;
  text: string;
  arguments?: Record<string, BlockArgument>;
}

export interface ExtensionMetadata {
  id: string;
  name: string;
  blockIconURI?: string;
  menuIconURI?: string;
  color1?: string;
  color2?: string;
  color3?: string;
  blocks: BlockMetadata[];
}
