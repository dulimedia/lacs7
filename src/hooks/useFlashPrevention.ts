import { useEffect, useState, useRef } from 'react';
import { useGLBState } from '../store/glbState';

export const useFlashPrevention = () => {
  const { selectedUnit, selectedBuilding, selectedFloor } = useGLBState();
  const [preventFlash, setPreventFlash] = useState(false);
  const lastSelectionRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failsafeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Create a selection signature
    const currentSelection = `${selectedBuilding || ''}-${selectedFloor || ''}-${selectedUnit || ''}`;

    if (!currentSelection) {
      // No selection, just clear any pending freeze frame
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setPreventFlash(false);
      lastSelectionRef.current = currentSelection;
      return;
    }

    // DISABLED: Flash prevention causes more visual glitching than it solves.
    // The "freeze frame" was perceived as a flash.
    // if (currentSelection !== lastSelectionRef.current) { ... }

    lastSelectionRef.current = currentSelection;
    setPreventFlash(false); // Always false

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (failsafeTimeoutRef.current) clearTimeout(failsafeTimeoutRef.current);
    };
  }, [selectedUnit, selectedBuilding, selectedFloor]);

  return {
    preventFlash,
    activateFlashPrevention: () => setPreventFlash(true)
  };
};