<script setup lang="ts">
import { HistoryPoint } from '@src/core/arb-history';
import { formatProfit } from '@src/core/daily-profit/profit-format';
import { t } from '@src/i18n';

// Profit per day of one chance over time (player, 2026-11-06). One line, gaps where the chance
// had no trade; a crosshair with the time and value under the mouse.
const { points } = defineProps<{ points: HistoryPoint[] }>();

const $style = useCssModule();

const W = 600;
const H = 120;
const PAD = { left: 44, right: 8, top: 8, bottom: 18 };

const values = computed(() => points.filter(x => x[1] !== null) as [number, number][]);

const scale = computed(() => {
  const v = values.value;
  if (v.length === 0) {
    return undefined;
  }
  const t0 = points[0][0];
  const t1 = Math.max(points.at(-1)![0], t0 + 1);
  let lo = Math.min(0, ...v.map(x => x[1]));
  let hi = Math.max(...v.map(x => x[1]));
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const x = (time: number) => PAD.left + ((time - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
  const y = (value: number) => PAD.top + ((hi - value) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  return { t0, t1, lo, hi, x, y };
});

// One path, broken at null points.
const path = computed(() => {
  const s = scale.value;
  if (!s) {
    return '';
  }
  let d = '';
  let pen = false;
  for (const [time, value] of points) {
    if (value === null) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${s.x(time).toFixed(1)},${s.y(value).toFixed(1)}`;
    pen = true;
  }
  return d;
});

// Single points with no neighbour do not draw as a line: show them as dots.
const dots = computed(() => {
  const s = scale.value;
  if (!s) {
    return [];
  }
  return points
    .filter(
      (p, i) =>
        p[1] !== null &&
        (points[i - 1]?.[1] ?? null) === null &&
        (points[i + 1]?.[1] ?? null) === null,
    )
    .map(p => ({ x: s.x(p[0]), y: s.y(p[1]!) }));
});

function time(at: number) {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const hover = ref<{ x: number; y: number; at: number; value: number }>();

function onMove(e: MouseEvent) {
  const s = scale.value;
  if (!s) {
    return;
  }
  const svg = e.currentTarget as SVGSVGElement;
  const box = svg.getBoundingClientRect();
  const mx = ((e.clientX - box.left) / box.width) * W;
  let best: [number, number] | undefined;
  for (const p of values.value) {
    if (best === undefined || Math.abs(s.x(p[0]) - mx) < Math.abs(s.x(best[0]) - mx)) {
      best = p;
    }
  }
  hover.value = best
    ? { x: s.x(best[0]), y: s.y(best[1]), at: best[0], value: best[1] }
    : undefined;
}
</script>

<template>
  <div :class="$style.chart">
    <p v-if="!scale" :class="$style.empty">{{ t('arb.chartEmpty') }}</p>
    <svg
      v-else
      :viewBox="`0 0 ${W} ${H}`"
      :class="$style.svg"
      @mousemove="onMove"
      @mouseleave="hover = undefined">
      <line :x1="PAD.left" :x2="W - PAD.right" :y1="scale.y(scale.hi)" :y2="scale.y(scale.hi)" />
      <line
        v-if="scale.lo < 0"
        :class="$style.zero"
        :x1="PAD.left"
        :x2="W - PAD.right"
        :y1="scale.y(0)"
        :y2="scale.y(0)" />
      <line :x1="PAD.left" :x2="W - PAD.right" :y1="scale.y(scale.lo)" :y2="scale.y(scale.lo)" />
      <text :x="PAD.left - 4" :y="scale.y(scale.hi) + 4" text-anchor="end">
        {{ formatProfit(scale.hi) }}
      </text>
      <text :x="PAD.left - 4" :y="scale.y(scale.lo)" text-anchor="end">
        {{ formatProfit(scale.lo) }}
      </text>
      <text :x="PAD.left" :y="H - 4">{{ time(scale.t0) }}</text>
      <text :x="W - PAD.right" :y="H - 4" text-anchor="end">{{ time(scale.t1) }}</text>
      <path :class="$style.line" :d="path" />
      <circle v-for="(d, i) in dots" :key="i" :class="$style.dot" :cx="d.x" :cy="d.y" r="3" />
      <template v-if="hover">
        <line
          :class="$style.cross"
          :x1="hover.x"
          :x2="hover.x"
          :y1="PAD.top"
          :y2="H - PAD.bottom" />
        <circle :class="$style.dot" :cx="hover.x" :cy="hover.y" r="4" />
      </template>
    </svg>
    <div v-if="hover" :class="$style.tip">
      <span :class="$style.weak">{{ time(hover.at) }}</span>
      <span :class="$style.value">{{ formatProfit(hover.value) }}</span>
    </div>
  </div>
</template>

<style module>
.chart {
  position: relative;
  max-width: 732px;
}

.svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.svg line {
  stroke: var(--rpz-stroke-weak);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.svg .zero {
  stroke: var(--rpz-text-off);
  stroke-dasharray: 3 3;
}

.svg text {
  fill: var(--rpz-text-weak);
  font-size: 10px;
}

.line {
  fill: none;
  stroke: var(--rpz-text);
  stroke-width: 2;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.dot {
  fill: var(--rpz-text-strong);
  stroke: var(--rpz-bg-raised);
  stroke-width: 2;
}

.svg .cross {
  stroke: var(--rpz-text-weak);
}

.tip {
  position: absolute;
  top: 0;
  right: 8px;
  display: flex;
  gap: var(--rpz-space-2);
  padding: 2px 6px;
  background-color: var(--rpz-bg-overlay);
}

.weak {
  color: var(--rpz-text-weak);
}

.value {
  color: var(--rpz-text-strong);
  font-weight: 600;
}

.empty {
  margin: 0;
  color: var(--rpz-text-weak);
}
</style>
