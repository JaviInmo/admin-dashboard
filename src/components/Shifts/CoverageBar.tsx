"use client";
import type { Shift } from "@/components/Shifts/types";

function clampToDay(start: Date, end: Date, day: Date): [number, number] | null {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const s = Math.max(start.getTime(), dayStart);
  const e = Math.min(end.getTime(), dayEnd);
  if (e <= s) return null;
  return [s, e];
}

function mergeIntervals(intervals: Array<[number, number]>): Array<[number, number]> {
  if (intervals.length === 0) return [];
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  let [cs, ce] = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    if (s <= ce) {
      ce = Math.max(ce, e);
    } else {
      merged.push([cs, ce]);
      [cs, ce] = [s, e];
    }
  }
  merged.push([cs, ce]);
  return merged;
}

export function CoverageBar({ day, shifts }: { day: Date; shifts: Shift[] }) {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const totalMs = 24 * 60 * 60 * 1000;

  const intervals: Array<[number, number]> = [];
  for (const s of shifts) {
    if (!s.startTime || !s.endTime) continue;
    const st = new Date(s.startTime);
    const et = new Date(s.endTime);
    const clamped = clampToDay(st, et, day);
    if (clamped) intervals.push(clamped);
  }
  const merged = mergeIntervals(intervals);

  return (
    <div className="w-full h-3 rounded bg-muted relative overflow-hidden">
      {/* gaps background in orange, coverage on top in primary */}
      {/* Render coverage segments */}
      {merged.map(([s, e], idx) => {
        const left = ((s - dayStart) / totalMs) * 100;
        const width = ((e - s) / totalMs) * 100;
        return (
          <div
            key={idx}
            className="absolute top-0 bottom-0 bg-primary/70"
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        );
      })}
      {/* Underlay for gaps */}
      <div className="absolute inset-0 bg-orange-400/20 pointer-events-none" />
    </div>
  );
}
