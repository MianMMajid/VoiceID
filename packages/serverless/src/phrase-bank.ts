/**
 * Phrase bank for TTS challenges
 * Contains 100+ diverse phrases for voice verification
 * Each phrase is 5-8 words and phonetically diverse
 */

export const PHRASE_BANK: string[] = [
  // Common phrases
  "The quick brown fox jumps over",
  "My voice is my password verify me",
  "Please confirm my identity with this recording",
  "I authorize this voice verification session today",
  "Security check in progress right now",
  
  // Nature and weather
  "Sunshine brightens the morning sky beautifully today",
  "Rain falls gently on the green leaves",
  "Mountains rise majestically above the valley floor",
  "Ocean waves crash against the rocky shore",
  "Stars twinkle brightly in the night sky",
  "Wind whispers softly through the tall trees",
  "Clouds drift slowly across the blue horizon",
  "Thunder rumbles loudly during the summer storm",
  "Snow blankets the ground in pure white",
  "Flowers bloom colorfully in the spring garden",
  
  // Technology and modern life
  "Technology advances rapidly in our modern world",
  "Digital security protects my personal information daily",
  "Smartphones connect people across the entire globe",
  "Artificial intelligence transforms how we work today",
  "Cloud computing enables seamless data access everywhere",
  "Wireless networks provide instant internet connectivity now",
  "Biometric authentication ensures secure account access always",
  "Virtual meetings connect remote teams effectively together",
  "Encryption safeguards sensitive data from unauthorized access",
  "Innovation drives progress in every industry forward",
  
  // Daily activities
  "Morning coffee energizes my productive day ahead",
  "Exercise improves both physical and mental health",
  "Reading expands knowledge and imagination wonderfully well",
  "Cooking delicious meals brings family together happily",
  "Music fills the room with joyful energy",
  "Walking outdoors refreshes mind and body naturally",
  "Learning new skills opens exciting opportunities ahead",
  "Traveling explores diverse cultures and beautiful places",
  "Gardening connects us with nature and growth",
  "Writing captures thoughts and ideas clearly forever",
  
  // Business and professional
  "Professional development enhances career growth and success",
  "Teamwork achieves goals faster than working alone",
  "Communication skills improve workplace relationships significantly",
  "Leadership inspires others to reach their potential",
  "Innovation requires creativity and persistent effort",
  "Quality service builds lasting customer relationships well",
  "Strategic planning guides successful business decisions forward",
  "Collaboration creates better solutions through shared expertise",
  "Efficiency maximizes productivity in every task",
  "Excellence demands attention to important details",
  
  // Education and learning
  "Education opens doors to countless opportunities ahead",
  "Curiosity drives discovery and lifelong learning forward",
  "Knowledge empowers individuals to make informed decisions",
  "Practice develops mastery through consistent effort daily",
  "Questions lead to deeper understanding of concepts",
  "Research uncovers new insights and valuable information",
  "Critical thinking solves complex problems effectively now",
  "Creativity transforms ideas into innovative solutions today",
  "Mentorship guides students toward achieving their goals",
  "Wisdom comes from experience and thoughtful reflection",
  
  // Health and wellness
  "Healthy habits create lasting wellness and vitality",
  "Nutrition fuels the body with essential energy",
  "Mindfulness reduces stress and improves mental clarity",
  "Sleep restores energy for the next day",
  "Hydration maintains optimal body function throughout day",
  "Balance promotes harmony in work and life",
  "Strength training builds muscle and bone density",
  "Meditation calms the mind and reduces anxiety",
  "Fresh air invigorates body and spirit naturally",
  "Laughter improves mood and overall health significantly",
  
  // Relationships and social
  "Friendship enriches life with joy and support",
  "Kindness creates positive ripples throughout the community",
  "Trust forms the foundation of strong relationships",
  "Empathy helps us understand others better deeply",
  "Gratitude transforms perspective and increases happiness daily",
  "Respect honors the dignity of every person",
  "Honesty builds credibility and lasting trust always",
  "Compassion motivates us to help others generously",
  "Patience allows relationships to grow naturally strong",
  "Love connects hearts across all boundaries forever",
  
  // Science and discovery
  "Science reveals the mysteries of our universe",
  "Exploration pushes boundaries of human knowledge forward",
  "Discovery requires patience and careful observation always",
  "Experiments test hypotheses through rigorous methodology today",
  "Evidence guides conclusions in scientific research now",
  "Innovation emerges from curiosity and experimentation daily",
  "Analysis uncovers patterns in complex data sets",
  "Breakthrough moments change our understanding completely forever",
  "Observation captures details that reveal hidden truths",
  "Progress builds upon previous discoveries and insights",
  
  // Arts and creativity
  "Creativity expresses unique perspectives through artistic vision",
  "Imagination transforms ordinary into extraordinary experiences daily",
  "Design combines function with beautiful aesthetic appeal",
  "Performance captivates audiences with emotional storytelling power",
  "Expression communicates feelings beyond simple words alone",
  "Inspiration strikes when we open our minds",
  "Craftsmanship demonstrates skill through careful attention always",
  "Beauty exists in both nature and creation",
  "Rhythm moves the body and soul together",
  "Vision guides artists toward meaningful creative work",
  
  // Time and seasons
  "Autumn leaves paint the landscape golden red",
  "Winter brings peaceful quiet to the world",
  "Spring awakens new life and fresh beginnings",
  "Summer sunshine warms hearts and spirits bright",
  "Seasons change in their natural rhythmic cycle",
  "Time flows forward like a constant river",
  "Moments become memories we treasure forever deeply",
  "Yesterday taught lessons for tomorrow's journey ahead",
  "Today offers opportunities to make positive change",
  "Future holds unlimited potential and exciting possibilities",
  
  // Values and principles
  "Integrity guides actions even when nobody watches",
  "Courage faces challenges with determined strength",
  "Perseverance overcomes obstacles through persistent effort",
  "Responsibility accepts accountability for our choices",
  "Generosity shares resources with those in need",
  "Humility recognizes we always have more to learn",
  "Justice ensures fairness for all people equally",
  "Loyalty stands firm through difficult times together",
  "Optimism sees possibilities in every situation faced",
  "Resilience bounces back from setbacks stronger"
];

/**
 * Validates that a phrase meets the requirements
 * - Must be 5-8 words
 * - Must be phonetically diverse (contains various phonemes)
 */
export function validatePhrase(phrase: string): boolean {
  const words = phrase.trim().split(/\s+/);
  
  // Check word count (5-8 words)
  if (words.length < 5 || words.length > 8) {
    return false;
  }
  
  // Check phonetic diversity by ensuring variety of consonants and vowels
  const text = phrase.toLowerCase();
  const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
  const consonants = new Set('bcdfghjklmnpqrstvwxyz'.split(''));
  
  let vowelCount = 0;
  let consonantCount = 0;
  const uniqueVowels = new Set<string>();
  const uniqueConsonants = new Set<string>();
  
  for (const char of text) {
    if (vowels.has(char)) {
      vowelCount++;
      uniqueVowels.add(char);
    } else if (consonants.has(char)) {
      consonantCount++;
      uniqueConsonants.add(char);
    }
  }
  
  // Require at least 3 different vowels and 5 different consonants for diversity
  return uniqueVowels.size >= 3 && uniqueConsonants.size >= 5;
}

/**
 * Selects a random phrase from the phrase bank
 */
export function selectRandomPhrase(): string {
  const randomIndex = Math.floor(Math.random() * PHRASE_BANK.length);
  return PHRASE_BANK[randomIndex];
}

/**
 * Gets a validated random challenge phrase
 * Ensures the phrase meets all requirements
 */
export function getChallengePhraseText(): string {
  const phrase = selectRandomPhrase();
  
  // Validate the phrase (should always pass for our curated bank)
  if (!validatePhrase(phrase)) {
    throw new Error(`Invalid phrase selected: ${phrase}`);
  }
  
  return phrase;
}
