import { Vector3, Euler } from 'three';

export interface CameraPosition {
    position: [number, number, number];
    target: [number, number, number]; // LookAt target
}

export const UNIT_CAMERA_CONFIG: Record<string, CameraPosition> = {
    // Example format:
    // 'unit_key': { position: [x, y, z], target: [x, y, z] }

    // Specific overrides can be added here
    't-200': {
        position: [120, 50, 40],
        target: [0, 20, 0]
    },
    't-700': {
        position: [120, 150, 40],
        target: [0, 120, 0]
    }
};
