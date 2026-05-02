// Category constants used across the app
export const CATEGORIES = [
  { value: 'class-fee', label: 'Class Fee', emoji: '📚' },
  { value: 'campus-event', label: 'Campus Event', emoji: '🎉' },
  { value: 'donation', label: 'Donation', emoji: '🤝' },
  { value: 'canteen', label: 'Canteen', emoji: '🍜' },
  { value: 'organization', label: 'Organization', emoji: '🏛️' },
  { value: 'other', label: 'Other', emoji: '💡' },
]

export function getCategoryByValue(value) {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES[5]
}

export function getCategoryLabel(value) {
  const cat = getCategoryByValue(value)
  return `${cat.emoji} ${cat.label}`
}
