export type WarehouseSection = 'roof' | 'panels' | 'flooring';

// New types for unit-based system
export type UnitName = string; // e.g., 'a1', 'c10'

export interface UnitData {
  name: string; // Unit identifier (e.g., 'a1')
  size: string; // Size from Google Sheets
  availability: boolean; // Availability status as boolean
  floorPlanUrl?: string; // Optional floor plan image
  // Additional fields for the app
  unit_name: string; // Display name
  unit_key: string; // Unique identifier
  building: string; // Building name
  floor: string; // Floor number/name
  area_sqft?: number; // Square footage
  status: boolean; // Availability status as boolean
  unit_type: string; // Suite, Stage, etc.
  private_offices?: number; // Number of individual closed-door offices

  // New Normalized Fields
  is_production_office?: boolean; // Combined Plug & Play / Build to Suit
  has_kitchen?: boolean; // Normalized kitchen status
  amenities?: string; // Amenities string

  // URLs
  floorplan_url?: string; // Primary suite floorplan (was floorPlanUrl)
  full_floor_floorplan_url?: string; // Secondary full floor floorplan
  tour_3d_url?: string; // Matterport/3D tour URL

  // CONTACT EMAILS
  contact_email_id?: string; // Primary contact email for requests
  secondary_email?: string; // Secondary contact email (dwyatt@lacenterstudios.com)

  // Legacy fields (optional/deprecated)
  plug_and_play?: boolean;
  build_to_suit?: boolean;
}

export interface LoadedModel {
  name: string;
  object: any; // THREE.Group - using any to avoid THREE import issues
  isUnit: boolean;
  isBridge: boolean;
}

// Keep existing interfaces for backwards compatibility
export interface SectionInfo {
  title: string;
  description: string;
  details: {
    size: string;
    capacity: string;
    features: string[];
  };
  imageUrl: string;
}

export interface WarehouseSectionProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color: string;
  highlightColor: string;
  name: WarehouseSection;
  onSelect: (name: WarehouseSection) => void;
  isSelected: boolean;
  isAvailable: boolean;
}
