/**
 * Everyday routines familiar in Assamese homes. Steps are in their one
 * natural order. Only routines where the order is genuinely causal are used,
 * so a "wrong" answer is never a matter of habit.
 * Text: `routines.<routine>.title` and `routines.<routine>.steps.<step>`.
 */
export type RoutineStep = { id: string; emoji: string };
export type Routine = { id: string; emoji: string; steps: readonly RoutineStep[] };

export const ROUTINES: readonly Routine[] = [
  {
    id: 'make_tea',
    emoji: '☕',
    steps: [
      { id: 'boil_water', emoji: '♨️' },
      { id: 'add_leaves', emoji: '🍃' },
      { id: 'add_milk', emoji: '🥛' },
      { id: 'pour', emoji: '☕' },
      { id: 'drink', emoji: '😊' },
    ],
  },
  {
    id: 'morning',
    emoji: '🌅',
    steps: [
      { id: 'wake_up', emoji: '🛏️' },
      { id: 'brush', emoji: '🦷' },
      { id: 'bath', emoji: '🚿' },
      { id: 'dress', emoji: '👗' },
      { id: 'breakfast', emoji: '🍚' },
      { id: 'medicine', emoji: '💊' },
    ],
  },
  {
    id: 'cook_rice',
    emoji: '🍚',
    steps: [
      { id: 'wash_rice', emoji: '💧' },
      { id: 'into_pot', emoji: '🍲' },
      { id: 'cook', emoji: '🔥' },
      { id: 'serve', emoji: '🍽️' },
      { id: 'eat', emoji: '😋' },
    ],
  },
  {
    id: 'market',
    emoji: '🛍️',
    steps: [
      { id: 'take_bag', emoji: '👜' },
      { id: 'walk', emoji: '🚶' },
      { id: 'buy', emoji: '🥬' },
      { id: 'pay', emoji: '💵' },
      { id: 'come_home', emoji: '🏠' },
    ],
  },
  {
    id: 'garden',
    emoji: '🌱',
    steps: [
      { id: 'dig', emoji: '⛏️' },
      { id: 'seed', emoji: '🌰' },
      { id: 'cover', emoji: '🤲' },
      { id: 'water', emoji: '💧' },
      { id: 'sprout', emoji: '🌱' },
      { id: 'flower', emoji: '🌼' },
    ],
  },
  {
    id: 'wash_clothes',
    emoji: '👕',
    steps: [
      { id: 'soak', emoji: '💦' },
      { id: 'soap', emoji: '🧼' },
      { id: 'scrub', emoji: '🧽' },
      { id: 'rinse', emoji: '💧' },
      { id: 'dry', emoji: '☀️' },
      { id: 'fold', emoji: '👕' },
    ],
  },
];
