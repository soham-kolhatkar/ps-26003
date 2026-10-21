import { MAX_LEVEL as MEMORY_MAX_LEVEL } from './memory-match/board';
import { MemoryMatchGame } from './memory-match/MemoryMatchGame';
import { MAX_LEVEL as OBJECT_MAX_LEVEL } from './object-recognition/rounds';
import { ObjectRecognitionGame } from './object-recognition/ObjectRecognitionGame';
import { MAX_LEVEL as ROUTINE_MAX_LEVEL } from './routine-sequence/rounds';
import { RoutineSequenceGame } from './routine-sequence/RoutineSequenceGame';
import { MAX_LEVEL as PHOTO_MAX_LEVEL, MIN_PEOPLE } from './photo-recall/rounds';
import { PhotoRecallGame } from './photo-recall/PhotoRecallGame';
import { MAX_LEVEL as ODD_MAX_LEVEL } from './odd-one-out/rounds';
import { OddOneOutGame } from './odd-one-out/OddOneOutGame';
import { MAX_LEVEL as PATTERN_MAX_LEVEL } from './pattern/rounds';
import { PatternGame } from './pattern/PatternGame';
import { MAX_LEVEL as REACTION_MAX_LEVEL } from './reaction-tap/rounds';
import { ReactionTapGame } from './reaction-tap/ReactionTapGame';
import { MAX_LEVEL as WORD_MAX_LEVEL } from './word-recall/rounds';
import { WordRecallGame } from './word-recall/WordRecallGame';
import type { GameDefinition, GameId } from './types';
import { countPeople } from '@/db/repos/photos';
import { colors } from '@/theme/tokens';

/**
 * Games shown on the patient home, in display order. A game appears here only
 * once it is playable. Titles/descriptions/instructions: `games.<id>.*` in packs.
 */
export const GAMES: readonly GameDefinition[] = [
  {
    id: 'memory_match',
    icon: '🎴',
    tint: colors.tint.lilac,
    maxLevel: MEMORY_MAX_LEVEL,
    // Not a fixed round count: the game reports pairs via onProgress.
    trialsPerSession: 0,
    targetReactionMs: 3000,
    Component: MemoryMatchGame,
  },
  {
    id: 'routine_sequence',
    icon: '🍵',
    tint: colors.tint.sun,
    maxLevel: ROUTINE_MAX_LEVEL,
    // Progress = real decisions across 2 routines, reported via onProgress.
    trialsPerSession: 0,
    targetReactionMs: 6000,
    Component: RoutineSequenceGame,
  },
  {
    id: 'photo_recall',
    icon: '🫂',
    tint: colors.tint.clay,
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
    tint: colors.tint.leaf,
    maxLevel: OBJECT_MAX_LEVEL,
    trialsPerSession: 6,
    targetReactionMs: 4000,
    Component: ObjectRecognitionGame,
  },
  {
    id: 'odd_one_out',
    icon: '🧺',
    tint: colors.tint.sun,
    maxLevel: ODD_MAX_LEVEL,
    trialsPerSession: 6,
    targetReactionMs: 6000,
    Component: OddOneOutGame,
  },
  {
    id: 'pattern',
    icon: '🧮',
    tint: colors.tint.lilac,
    maxLevel: PATTERN_MAX_LEVEL,
    trialsPerSession: 5,
    // The row is read aloud first (about 4–6 s), and timing starts with it.
    targetReactionMs: 10000,
    Component: PatternGame,
  },
  {
    id: 'reaction_tap',
    icon: '🐟',
    tint: colors.tint.pond,
    maxLevel: REACTION_MAX_LEVEL,
    trialsPerSession: 10,
    // Tapping a fish within 1.5 s earns the full speed score (older adults' simple reaction time).
    targetReactionMs: 1500,
    Component: ReactionTapGame,
  },
  {
    id: 'word_recall',
    icon: '💡',
    tint: colors.tint.leaf,
    maxLevel: WORD_MAX_LEVEL,
    // Not a fixed round count: one trial per tap, progress = pictures found (onProgress).
    trialsPerSession: 0,
    // No reaction times are recorded (recognition after a delay), so the score is accuracy only.
    targetReactionMs: 5000,
    Component: WordRecallGame,
  },
];

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === (id as GameId));
}
