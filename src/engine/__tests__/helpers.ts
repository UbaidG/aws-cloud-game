import { defaultConfigFor } from '../catalog';
import type { Block, BlockConfig, Board, ServiceType, Wire } from '../types';

export function block(id: string, type: ServiceType, gridX: number, gridZ = 0, config?: Partial<BlockConfig>, extra?: Partial<Block>): Block {
  return { id, type, name: id, gridX, gridZ, config: { ...defaultConfigFor(type), ...config }, ...extra };
}

export function wire(a: string, b: string, id = `${a}--${b}`): Wire {
  return { id, a, b };
}

export function board(blocks: Block[], wires: Wire[] = []): Board {
  return { blocks, wires };
}

export const users = () => block('users', 'client', -6);
