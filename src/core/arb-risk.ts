// How likely a trade is to lose money because the end price moves while the goods are on the
// way and waiting to sell (player, 2026-11-06: set the failure rate, not a multiple).
//
// The margin a trade makes is measured in "usual price moves": k = 利润率 / (σ × √天数).
// The table below says which k goes with which failure rate, measured, not assumed:
// for 20 series (material × exchange), σ was taken from the previous 30 daily closes and
// compared with what the price actually did over the next N days — about 17,500 observations
// per horizon. P_GRID are failure rates in percent, K_BY_DAY[N] the k each one needs.
// Source: FIO /exchange/cxpc DAY_ONE candles, computed 2026-11-06.

const P_GRID = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 40, 50];

const K_BY_DAY: Record<number, number[]> = {
  1: [3.265, 2.501, 2.104, 1.688, 1.434, 1.121, 0.763, 0.512, 0.318, 0.176, 0.0, 0.0],
  2: [2.413, 1.85, 1.59, 1.266, 1.079, 0.867, 0.627, 0.443, 0.293, 0.187, 0.024, 0.0],
  3: [2.12, 1.563, 1.353, 1.078, 0.923, 0.75, 0.55, 0.397, 0.282, 0.185, 0.034, 0.0],
  4: [1.942, 1.417, 1.212, 0.975, 0.819, 0.682, 0.503, 0.369, 0.269, 0.179, 0.038, 0.0],
  5: [1.812, 1.321, 1.124, 0.897, 0.763, 0.627, 0.465, 0.348, 0.254, 0.172, 0.039, 0.0],
  6: [1.659, 1.225, 1.033, 0.833, 0.709, 0.587, 0.441, 0.328, 0.238, 0.162, 0.038, 0.0],
  7: [1.545, 1.168, 1.004, 0.797, 0.675, 0.56, 0.42, 0.315, 0.227, 0.154, 0.036, 0.0],
  8: [1.481, 1.108, 0.94, 0.768, 0.645, 0.535, 0.4, 0.301, 0.221, 0.151, 0.041, 0.0],
  9: [1.415, 1.049, 0.897, 0.745, 0.625, 0.516, 0.383, 0.288, 0.214, 0.149, 0.039, 0.0],
  10: [1.375, 1.008, 0.87, 0.708, 0.602, 0.492, 0.364, 0.277, 0.207, 0.144, 0.038, 0.0],
  11: [1.302, 0.986, 0.844, 0.688, 0.577, 0.475, 0.357, 0.266, 0.2, 0.14, 0.036, 0.0],
  12: [1.227, 0.97, 0.826, 0.668, 0.559, 0.46, 0.343, 0.261, 0.194, 0.137, 0.035, 0.0],
  13: [1.2, 0.936, 0.81, 0.647, 0.55, 0.45, 0.334, 0.251, 0.186, 0.13, 0.033, 0.0],
  14: [1.131, 0.907, 0.784, 0.638, 0.541, 0.439, 0.325, 0.245, 0.181, 0.125, 0.033, 0.0],
};

const MIN_DAY = 1;
const MAX_DAY = 14;

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// The k row for a number of days, between the two whole days around it.
function kRow(days: number) {
  const d = Math.min(Math.max(days, MIN_DAY), MAX_DAY);
  const lo = Math.floor(d);
  const hi = Math.min(lo + 1, MAX_DAY);
  const t = d - lo;
  return K_BY_DAY[lo].map((x, i) => mix(x, K_BY_DAY[hi][i], t));
}

// How many usual moves the margin must cover for this failure rate.
export function hurdleK(failurePercent: number, days: number) {
  const row = kRow(days);
  const p = Math.min(Math.max(failurePercent, 0), 100);
  if (p <= P_GRID[0]) {
    // Below the measured range the table says nothing, so the strictest measured value stands.
    return row[0];
  }
  if (p >= P_GRID.at(-1)!) {
    return 0;
  }
  for (let i = 1; i < P_GRID.length; i++) {
    if (p <= P_GRID[i]) {
      const t = (p - P_GRID[i - 1]) / (P_GRID[i] - P_GRID[i - 1]);
      return mix(row[i - 1], row[i], t);
    }
  }
  return 0;
}

// The margin (profit / cost) a trade needs for this failure rate.
export function requiredMargin(
  failurePercent: number,
  volatility: number | undefined,
  days: number,
) {
  return hurdleK(failurePercent, days) * expectedMove(volatility, days);
}

// How far the price usually moves over these days.
export function expectedMove(volatility: number | undefined, days: number) {
  const sigma = volatility !== undefined && volatility > 0 ? volatility : NO_VOLATILITY_SIGMA;
  return sigma * Math.sqrt(Math.max(days, MIN_DAY));
}

// A material that hardly trades has no usable volatility; this stands in for it.
export const NO_VOLATILITY_SIGMA = 0.05;

// The failure rate of a trade with this margin: the table read the other way.
export function failureRate(margin: number, volatility: number | undefined, days: number) {
  const move = expectedMove(volatility, days);
  if (move <= 0) {
    return 0;
  }
  const k = margin / move;
  const row = kRow(days);
  if (k >= row[0]) {
    return P_GRID[0];
  }
  for (let i = 1; i < row.length; i++) {
    if (k >= row[i]) {
      const span = row[i - 1] - row[i];
      const t = span > 0 ? (row[i - 1] - k) / span : 0;
      return mix(P_GRID[i - 1], P_GRID[i], t);
    }
  }
  return 100;
}
