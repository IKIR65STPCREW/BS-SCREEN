import { describe, it, expect } from "vitest";
import { calculateScreen, MAX_SCREEN_WIDTH_M, MAX_SCREEN_HEIGHT_M } from "./calculations";
import { makeDefaultScreen } from "./defaults";
import { getPresetById } from "../data/cabinetPresets";

const half = getPresetById("p26-0.5x0.5");

describe("calculateScreen — защита от некорректных размеров", () => {
  it("огромные размеры ограничиваются лимитом и дают предупреждение", () => {
    const t = performance.now();
    const s = calculateScreen(makeDefaultScreen({ widthMeters: 3000, heightMeters: 1e6 }), half);
    expect(performance.now() - t).toBeLessThan(2000);
    expect(s.actualWidthM).toBe(MAX_SCREEN_WIDTH_M);
    expect(s.actualHeightM).toBe(MAX_SCREEN_HEIGHT_M);
    expect(s.warnings.some((w) => w.includes("ограничен"))).toBe(true);
  });

  it("NaN / Infinity / отрицательные не ломают расчёт", () => {
    for (const [w, h] of [[NaN, 3], [Infinity, 3], [-1, 3], [7, NaN]]) {
      const s = calculateScreen(makeDefaultScreen({ widthMeters: w, heightMeters: h }), half);
      expect(Number.isFinite(s.resolutionX)).toBe(true);
      expect(Number.isFinite(s.legsCount)).toBe(true);
      expect(s.totalCabinets).toBe(0);
    }
  });
});

describe("ноги считаются от фактической ширины", () => {
  it("7.7 м → фактически 7.5 м → 8 ног; 7.2 м → 7 м → 7 ног", () => {
    expect(calculateScreen(makeDefaultScreen({ widthMeters: 7.7 }), half).legsCount).toBe(8);
    expect(calculateScreen(makeDefaultScreen({ widthMeters: 7.2 }), half).legsCount).toBe(7);
    expect(calculateScreen(makeDefaultScreen({ widthMeters: 2.4 }), half).legsCount).toBe(2);
  });
  it("экран без модулей — 0 ног", () => {
    expect(calculateScreen(makeDefaultScreen({ widthMeters: 0.3 }), half).legsCount).toBe(0);
  });
});
