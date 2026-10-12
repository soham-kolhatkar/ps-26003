import { MAX_LEVEL as MEMORY_MAX_LEVEL } from './memory-match/board';
import { MemoryMatchGame } from './memory-match/MemoryMatchGame';
import { MAX_LEVEL as OBJECT_MAX_LEVEL } from './object-recognition/rounds';
import { ObjectRecognitionGame } from './object-recognition/ObjectRecognitionGame';
import type { GameDefinition, GameId } from './types';

/**
 * Games shown on the patient home, in display order. A game appears here only
 * once it is playable. Titles/descriptions/instructions: `games.<id>.*` in packs.
 */
export const GAMES: readonly GameDefinition[] = [
  {
    id: 'memory_match',
    icon: '🃏',
    maxLevel: MEMORY_MAX_LEVEL,
    // Not a fixed round count: the game reports pairs via onProgress.
    trialsPerSession: 0,
    targetReactionMs: 3000,
    Component: MemoryMatchGame,
  },
  {
    id: 'object_recognition',
    icon: '🔍',
    maxLevel: OBJECT_MAX_LEVEL,
    trialsPerSession: 6,
    targetReactionMs: 4000,
    Component: ObjectRecognitionGame,
  },
];

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === (id as GameId));
}
