import { createContext, useContext } from 'react';
import type { BoardRenderer } from '../../render';

/** The live 3D renderer, for UI that needs to steer the camera ("show me"). */
export const RendererContext = createContext<BoardRenderer | null>(null);
export const useRenderer = () => useContext(RendererContext);
