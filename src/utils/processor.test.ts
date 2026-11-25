import { describe, it, expect } from "vitest";
import { calculateProject } from "./calculations";
import { buildPatchPlan, resolveProcessor } from "./processor";
import { makeDefaultConfig, makeDefaultScreen } from "./defaults";
import type { ProjectConfig } from "../types";

function manual(processorId: string, patch: Partial<ProjectConfig> = {}): ProjectConfig {
  return { ...makeDefaultConfig(), processorMode: "manual", processorId, ...patch };
}

describe("buildPatchPlan — ручной режим", () => {
  it("новый экран не переопределяет общую модель", () => {
    expect(makeDefaultScreen().processorId).toBeUndefined();
  });

  it("общая модель применяется ко всем экранам", () => {
    for (const id of ["vx600", "vx1000", "vx2000pro"]) {
      const c = manual(id, {
        screens: [makeDefaultScreen({ name: "L" }), makeDefaultScreen({ name: "R" })]
      });
      const plan = buildPatchPlan(c, calculateProject(c));
      expect(plan.units.map((u) => u.processor.id)).toEqual([id, id]);
    }
  });

  it("переопределение в карточке экрана имеет приоритет", () => {
    const c = manual("vx600", {
      screens: [makeDefaultScreen({ name: "L" }), makeDefaultScreen({ name: "C", processorId: "vx2000pro" })]
    });
    const plan = buildPatchPlan(c, calculateProject(c));
    expect(plan.units.map((u) => u.processor.id)).toEqual(["vx600", "vx2000pro"]);
  });
});

describe("рекомендация процессора учитывает backup", () => {
  it("авто: проект 7×3 м с backup требует 12 портов, VX600 (6 портов) не подходит", () => {
    const c = makeDefaultConfig(); // 7×3 м, backup включён
    const r = calculateProject(c);
    expect(r.totalPorts).toBe(6);
    const rec = resolveProcessor(r, "auto", c.processorId);
    expect(rec.processor.portCount).toBeGreaterThanOrEqual(12);
    // Совпадает с реальным патч-планом.
    const plan = buildPatchPlan(c, r);
    expect(rec.processor.id).toBe(plan.units[0].processor.id);
    expect(rec.reasons[0]).toContain("Нужно портов: 12");
  });

  it("авто: без backup хватает VX600", () => {
    const c = { ...makeDefaultConfig(), backupEnabled: false };
    const rec = resolveProcessor(calculateProject(c), "auto", c.processorId);
    expect(rec.processor.id).toBe("vx600");
  });

  it("ручной: VX600 с backup помечается как не подходящий", () => {
    const c = manual("vx600");
    const rec = resolveProcessor(calculateProject(c), "manual", "vx600");
    expect(rec.fits).toBe(false);
    expect(rec.unitsNeeded).toBe(2);
  });
});
