
export enum HairLossCategory {
  MALE_PATTERN = 'Male Pattern Hair Loss',
  FEMALE_PATTERN = 'Female Pattern Hair Loss',
  EYEBROW = 'Eyebrow Reconstruction',
  BEARD = 'Beard Graft'
}

export enum HairType {
  STRAIGHT = 'Straight',
  WAVY = 'Wavy',
  CURLY = 'Curly',
  COILY = 'Coily / Afro-textured'
}

export enum Ethnicity {
  CAUCASIAN = 'Caucasian / White',
  AFRICAN = 'Black / African Descent',
  ASIAN = 'Asian (East/Southeast)',
  SOUTH_ASIAN = 'South Asian (Indian/Pakistani)',
  HISPANIC = 'Hispanic / Latino',
  MIDDLE_EASTERN = 'Middle Eastern / Arab',
  NATIVE = 'Native American / Indigenous',
  MIXED = 'Mixed / Multi-ethnic',
  OTHER = 'Other'
}

export enum HairLossArea {
  FRONTAL = 'Frontal hairline / temples',
  MID_SCALP = 'Mid-scalp',
  CROWN = 'Crown (vertex)',
  FULL = 'Full scalp (combined regions)',
  CUSTOM = 'Custom Drawn Mapping'
}

export enum GraftDensity {
  LOW = 'Low',
  MEDIUM = 'Medium (Clinically Recommended)',
  HIGH = 'High'
}

export interface VisualizationParams {
  density: GraftDensity;
  mask?: string; // Base64 of the surgical marking mask
}

export interface VisualizationResult {
  beforeImage: string;
  afterImage: string;
  timestamp: number;
}
