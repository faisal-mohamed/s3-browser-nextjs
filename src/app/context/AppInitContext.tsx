'use client';

import React, { createContext, useContext } from 'react';

interface AppInitContextProps {
  isReady: boolean;
}

const AppInitContext = createContext<AppInitContextProps>({ isReady: false });

export function useAppInitialized() {
  return useContext(AppInitContext);
}

export default AppInitContext;
