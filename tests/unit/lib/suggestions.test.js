// Tests des suggestions des joueurs (src/lib/suggestions.js) : ajout, ordre
// (plus récente en premier), refus du vide, suppression (porté du legacy).
import { beforeEach, describe, expect, it } from 'vitest';

import { addSuggestion, loadSuggestions, removeSuggestion } from '@/lib/suggestions.js';

beforeEach(() => {
  localStorage.clear();
});

describe('suggestions', () => {
  it('ajoute et liste la plus récente en premier', () => {
    addSuggestion('Test suggestion A', 'Joris');
    addSuggestion('Test suggestion B', 'Test');
    const sl = loadSuggestions();
    expect(sl).toHaveLength(2);
    expect(sl[0].text).toBe('Test suggestion B');
  });

  it('refuse une suggestion vide', () => {
    expect(addSuggestion('   ', 'X')).toBeNull();
  });

  it('supprime une suggestion', () => {
    addSuggestion('A', 'J');
    const sl = loadSuggestions();
    removeSuggestion(sl[0].id);
    expect(loadSuggestions()).toHaveLength(0);
  });
});
