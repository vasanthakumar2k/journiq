/**
 * Lightweight AI Service for Journiq.
 * Uses rule-based logic and keyword extraction for intelligent tagging.
 */

const TAG_CATEGORIES = {
  ADVENTURE: ['hiking', 'climbing', 'surfing', 'trekking', 'backpacking', 'camping', 'trail', 'mountain', 'explore'],
  RELAXATION: ['beach', 'spa', 'massage', 'quiet', 'peaceful', 'calm', 'serenity', 'meditation', 'reading', 'sunset'],
  CULTURAL: ['museum', 'temple', 'shrine', 'tradition', 'history', 'art', 'festival', 'local', 'market', 'workshop'],
  GASTRONOMY: ['food', 'dinner', 'lunch', 'breakfast', 'cuisine', 'tasting', 'wine', 'coffee', 'cafe', 'delicious'],
  NATURE: ['forest', 'river', 'lake', 'ocean', 'wildlife', 'trees', 'park', 'garden', 'plants', 'view'],
  VIBRANT: ['party', 'music', 'dance', 'nightlife', 'city', 'crowded', 'energy', 'bright', 'neon'],
};

/**
 * Generates tags based on the title and narrative.
 * @param {string} title 
 * @param {string} narrative 
 * @returns {string[]} - Array of suggested tags.
 */
export const generateInsights = (title = '', narrative = '') => {
  const content = (title + ' ' + narrative).toLowerCase();
  const suggestedTags = new Set();

  // Basic keyword mapping
  Object.entries(TAG_CATEGORIES).forEach(([tag, keywords]) => {
    if (keywords.some(keyword => content.includes(keyword))) {
      suggestedTags.add(tag.charAt(0) + tag.slice(1).toLowerCase());
    }
  });

  // Emotional analysis (simple)
  const happyWords = ['happy', 'amazing', 'great', 'wonderful', 'joy', 'love', 'perfect'];
  if (happyWords.some(w => content.includes(w))) {
    suggestedTags.add('High Energy');
  }

  // Time-based (if mentioned)
  if (content.includes('morning') || content.includes('sunrise')) suggestedTags.add('Early Bird');
  if (content.includes('night') || content.includes('midnight')) suggestedTags.add('Night Owl');
  if (content.includes('sunset') || content.includes('golden hour')) suggestedTags.add('Golden Hour');

  // Convert Set to Array and limit to 4 tags for UI cleaness
  return Array.from(suggestedTags).slice(0, 4);
};
