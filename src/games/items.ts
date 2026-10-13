/**
 * Everyday, familiar objects for Assam / North East households, shared by games.
 * Names live in the language packs under `items.<id>`; category names under
 * `categories.<id>`.
 */
export type Category = 'fruit' | 'vegetable' | 'animal' | 'bird' | 'vehicle' | 'household';

export type Item = {
  id: string;
  emoji: string;
  /**
   * Only for items whose group is unambiguous (used by "Odd one out").
   * Fish, rice, tea… are left out on purpose: fish is both an animal and food.
   */
  category?: Category;
};

/** Categories in the same family are "near" (harder to tell apart). */
export const CATEGORY_FAMILY: Record<Category, 'food' | 'living' | 'things'> = {
  fruit: 'food',
  vegetable: 'food',
  animal: 'living',
  bird: 'living',
  vehicle: 'things',
  household: 'things',
};

export const ITEMS: readonly Item[] = [
  { id: 'tea', emoji: '☕' },
  { id: 'banana', emoji: '🍌', category: 'fruit' },
  { id: 'fish', emoji: '🐟' },
  { id: 'rice', emoji: '🍚' },
  { id: 'umbrella', emoji: '☂️', category: 'household' },
  { id: 'flower', emoji: '🌼' },
  { id: 'cow', emoji: '🐄', category: 'animal' },
  { id: 'house', emoji: '🏠' },
  { id: 'clock', emoji: '🕰️', category: 'household' },
  { id: 'glasses', emoji: '👓', category: 'household' },
  { id: 'key', emoji: '🔑', category: 'household' },
  { id: 'book', emoji: '📖', category: 'household' },
  { id: 'chair', emoji: '🪑', category: 'household' },
  { id: 'bicycle', emoji: '🚲', category: 'vehicle' },
  { id: 'mango', emoji: '🥭', category: 'fruit' },
  { id: 'lamp', emoji: '🪔', category: 'household' },
  { id: 'bell', emoji: '🔔', category: 'household' },
  { id: 'drum', emoji: '🥁' },
  { id: 'rhino', emoji: '🦏', category: 'animal' },
  { id: 'orange', emoji: '🍊', category: 'fruit' },
  { id: 'elephant', emoji: '🐘', category: 'animal' },
  { id: 'boat', emoji: '🛶', category: 'vehicle' },
  { id: 'goat', emoji: '🐐', category: 'animal' },
  { id: 'apple', emoji: '🍎', category: 'fruit' },
  // F08: more categorised items for "Odd one out".
  { id: 'pineapple', emoji: '🍍', category: 'fruit' },
  { id: 'grapes', emoji: '🍇', category: 'fruit' },
  { id: 'watermelon', emoji: '🍉', category: 'fruit' },
  { id: 'coconut', emoji: '🥥', category: 'fruit' },
  { id: 'lemon', emoji: '🍋', category: 'fruit' },
  { id: 'carrot', emoji: '🥕', category: 'vegetable' },
  { id: 'potato', emoji: '🥔', category: 'vegetable' },
  { id: 'chilli', emoji: '🌶️', category: 'vegetable' },
  { id: 'onion', emoji: '🧅', category: 'vegetable' },
  { id: 'corn', emoji: '🌽', category: 'vegetable' },
  { id: 'cucumber', emoji: '🥒', category: 'vegetable' },
  { id: 'garlic', emoji: '🧄', category: 'vegetable' },
  { id: 'greens', emoji: '🥬', category: 'vegetable' },
  { id: 'dog', emoji: '🐕', category: 'animal' },
  { id: 'cat', emoji: '🐈', category: 'animal' },
  { id: 'buffalo', emoji: '🐃', category: 'animal' },
  { id: 'hen', emoji: '🐔', category: 'bird' },
  { id: 'duck', emoji: '🦆', category: 'bird' },
  { id: 'parrot', emoji: '🦜', category: 'bird' },
  { id: 'peacock', emoji: '🦚', category: 'bird' },
  { id: 'owl', emoji: '🦉', category: 'bird' },
  { id: 'bus', emoji: '🚌', category: 'vehicle' },
  { id: 'car', emoji: '🚗', category: 'vehicle' },
  { id: 'auto', emoji: '🛺', category: 'vehicle' },
  { id: 'train', emoji: '🚂', category: 'vehicle' },
  { id: 'truck', emoji: '🚚', category: 'vehicle' },
];

export const CATEGORIES: readonly Category[] = ['fruit', 'vegetable', 'animal', 'bird', 'vehicle', 'household'];

export function itemsIn(category: Category, pool: readonly Item[] = ITEMS): Item[] {
  return pool.filter((it) => it.category === category);
}
