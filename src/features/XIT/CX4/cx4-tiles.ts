import { HiddenOrderBooks } from '@src/infrastructure/prun-ui/hidden-order-books';
import { userData } from '@src/store/user-data';

export const CX4_EXCHANGES = ['AI1', 'CI1', 'IC1', 'NC1'];

// One hidden CXOB window per exchange; they close when XIT CX4 closes.
let books: HiddenOrderBooks | undefined;

export async function showMaterial(ticker: string) {
  const recent = userData.cx4.recent.filter(x => x !== ticker);
  recent.unshift(ticker);
  userData.cx4.recent = recent.slice(0, 10);
  books ??= new HiddenOrderBooks();
  await books.show(CX4_EXCHANGES.map(x => `${ticker}.${x}`));
}

export function closeHiddenBooks() {
  books?.close();
  books = undefined;
}

export function toggleFavorite(ticker: string) {
  const favorites = userData.cx4.favorites;
  userData.cx4.favorites = favorites.includes(ticker)
    ? favorites.filter(x => x !== ticker)
    : [...favorites, ticker].sort();
}
