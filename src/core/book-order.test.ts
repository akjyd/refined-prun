import { describe, expect, it } from 'vitest';
import { drawnOrder } from '@src/core/book-order';

describe('drawnOrder', () => {
  it('keeps the sequence of one price as the game draws it', () => {
    // What the game holds, measured against its own book (player, 2026-11-07).
    const held = [
      { id: 'a', price: 149 },
      { id: 'b', price: 148 },
      { id: 'c', price: 148 },
      { id: 'd', price: 148 },
      { id: 'e', price: 146 },
    ];
    expect(drawnOrder(held, x => x.price).map(x => x.id)).toEqual(['a', 'd', 'c', 'b', 'e']);
  });
});
