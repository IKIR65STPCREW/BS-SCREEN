import { describe, it, expect } from "vitest";
import { calculateProject } from "./calculations";
import { buildPatchPlan } from "./processor";
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
