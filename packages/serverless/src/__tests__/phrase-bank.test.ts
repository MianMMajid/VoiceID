/**
 * Tests for phrase bank and phrase generation
 */

import { describe, it, expect } from 'vitest';
import {
  PHRASE_BANK,
  validatePhrase,
  selectRandomPhrase,
  getChallengePhraseText
} from '../phrase-bank';

describe('Phrase Bank', () => {
  it('should have at least 100 phrases', () => {
    expect(PHRASE_BANK.length).toBeGreaterThanOrEqual(100);
  });
  
  it('should have all unique phrases', () => {
    const uniquePhrases = new Set(PHRASE_BANK);
    expect(uniquePhrases.size).toBe(PHRASE_BANK.length);
  });
  
  it('should have all phrases with 5-8 words', () => {
    for (const phrase of PHRASE_BANK) {
      const wordCount = phrase.trim().split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(5);
      expect(wordCount).toBeLessThanOrEqual(8);
    }
  });
});

describe('validatePhrase', () => {
  it('should validate phrases with 5-8 words', () => {
    expect(validatePhrase('The quick brown fox jumps over')).toBe(true);
    expect(validatePhrase('My voice is my password verify me')).toBe(true);
  });
  
  it('should reject phrases with too few words', () => {
    expect(validatePhrase('Too few words')).toBe(false);
    expect(validatePhrase('Only four words here')).toBe(false);
  });
  
  it('should reject phrases with too many words', () => {
    expect(validatePhrase('This phrase has way too many words for validation')).toBe(false);
  });
  
  it('should validate phonetic diversity', () => {
    // Good diversity
    expect(validatePhrase('The quick brown fox jumps over')).toBe(true);
    
    // Poor diversity (limited consonants/vowels)
    expect(validatePhrase('aaa aaa aaa aaa aaa')).toBe(false);
  });
  
  it('should require at least 3 different vowels', () => {
    // Has a, e, i, o, u
    expect(validatePhrase('The quick brown fox jumps over')).toBe(true);
    
    // Only has 'a' vowel
    expect(validatePhrase('bad cat had fat man')).toBe(false);
  });
  
  it('should require at least 5 different consonants', () => {
    // Has many consonants: q, c, k, b, r, w, n, f, x, j, m, p, s, v, l, d, g, h, t, y, z
    expect(validatePhrase('The quick brown fox jumps over')).toBe(true);
  });
});

describe('selectRandomPhrase', () => {
  it('should return a phrase from the bank', () => {
    const phrase = selectRandomPhrase();
    expect(PHRASE_BANK).toContain(phrase);
  });
  
  it('should return different phrases on multiple calls', () => {
    const phrases = new Set<string>();
    
    // Generate 20 phrases - should get some variety
    for (let i = 0; i < 20; i++) {
      phrases.add(selectRandomPhrase());
    }
    
    // With 100+ phrases, we should get at least 2 different ones in 20 tries
    expect(phrases.size).toBeGreaterThan(1);
  });
});

describe('getChallengePhraseText', () => {
  it('should return a valid phrase', () => {
    const phrase = getChallengePhraseText();
    expect(validatePhrase(phrase)).toBe(true);
  });
  
  it('should return phrases from the bank', () => {
    const phrase = getChallengePhraseText();
    expect(PHRASE_BANK).toContain(phrase);
  });
  
  it('should return different phrases on multiple calls', () => {
    const phrases = new Set<string>();
    
    for (let i = 0; i < 10; i++) {
      phrases.add(getChallengePhraseText());
    }
    
    // Should get some variety
    expect(phrases.size).toBeGreaterThan(1);
  });
});
