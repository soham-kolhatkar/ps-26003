import { MAX_LEVEL as MEMORY_MAX_LEVEL } from './memory-match/board';
import { MemoryMatchGame } from './memory-match/MemoryMatchGame';
import { MAX_LEVEL as OBJECT_MAX_LEVEL } from './object-recognition/rounds';
import { ObjectRecognitionGame } from './object-recognition/ObjectRecognitionGame';
import { MAX_LEVEL as ROUTINE_MAX_LEVEL } from './routine-sequence/rounds';
import { RoutineSequenceGame } from './routine-sequence/RoutineSequenceGame';
import { MAX_LEVEL as PHOTO_MAX_LEVEL, MIN_PEOPLE } from './photo-recall/rounds';
import { PhotoRecallGame } from './photo-recall/PhotoRecallGame';
import type { GameDefinition, GameId } from './types';
import { countPeople } from '@/db/repos/photos';

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
    id: 'routine_sequence',
    icon: '📋',
    maxLevel: ROUTINE_MAX_LEVEL,
    // Progress = real decisions across 2 routines, reported via onProgress.
    trialsPerSession: 0,
    targetReactionMs: 6000,
    Component: RoutineSequenceGame,
  },
  {
    id: 'photo_recall',
    icon: '👨‍👩‍👧',
    maxLevel: PHOTO_MAX_LEVEL,
    trialsPerSession: 5,
    targetReactionMs: 5000,
    Component: PhotoRecallGame,
    // Needs photos of at least 2 different family members (added by the caregiver).
    isAvailable: async (db, patientId) => (await countPeople(db, patientId)) >= MIN_PEOPLE,
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
