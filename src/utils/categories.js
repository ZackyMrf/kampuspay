// Category constants used across the app.
export const CATEGORIES = [
  { value: 'class-fee', label: 'Class Fee', emoji: 'CLS' },
  { value: 'campus-event', label: 'Campus Event', emoji: 'EVT' },
  { value: 'donation', label: 'Donation', emoji: 'DON' },
  { value: 'canteen', label: 'Canteen', emoji: 'F&B' },
  { value: 'marketplace', label: 'Marketplace', emoji: 'MKT' },
  { value: 'organization', label: 'Organization', emoji: 'ORG' },
  { value: 'other', label: 'Other', emoji: 'OTH' },
]

export function getCategoryByValue(value) {
  return CATEGORIES.find((c) => c.value === value) || CATEGORIES.at(-1)
}

export function getCategoryLabel(value) {
  const cat = getCategoryByValue(value)
  return `${cat.emoji} ${cat.label}`
}
