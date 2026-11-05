// Fitting several goods into one cargo hold.

export interface CartGood {
  // Units you want and the most the order books allow.
  wanted: number;
  market: number;
  weight: number;
  volume: number;
}

export interface FitResult {
  units: number;
  // The most this good can have, with the other goods as they are.
  max: number;
}

function room(capacity: number, used: number, per: number) {
  return per > 0 ? Math.floor((capacity - used) / per + 1e-9) : Infinity;
}

// Goods earlier in the list keep their units; later ones get what is left. Each good's max is
// what fits next to the others.
export function fitCart(goods: CartGood[], ship: { weight: number; volume: number }) {
  const units: number[] = [];
  let usedWeight = 0;
  let usedVolume = 0;
  for (const good of goods) {
    const fit = Math.max(
      0,
      Math.min(
        good.wanted,
        good.market,
        room(ship.weight, usedWeight, good.weight),
        room(ship.volume, usedVolume, good.volume),
      ),
    );
    units.push(fit);
    usedWeight += fit * good.weight;
    usedVolume += fit * good.volume;
  }
  return goods.map((good, i): FitResult => {
    const otherWeight = usedWeight - units[i] * good.weight;
    const otherVolume = usedVolume - units[i] * good.volume;
    const max = Math.max(
      0,
      Math.min(
        good.market,
        room(ship.weight, otherWeight, good.weight),
        room(ship.volume, otherVolume, good.volume),
      ),
    );
    return { units: units[i], max };
  });
}
