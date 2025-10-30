import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { setFaceDebug } from '../debug/FaceDebug';

export function useFaceDebugHotkey() {
  const { scene } = useThree();
  const [debugEnabled, setDebugEnabled] = useState(false);


  return debugEnabled;
}
