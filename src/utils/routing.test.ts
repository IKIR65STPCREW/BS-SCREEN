import { describe, it, expect } from "vitest";
import { buildPortGroups } from "./routing";
import type { CabinetCell } from "../types";

function makeCabinets(cols: number, rows: number, px = 36864): CabinetCell[] {
  const out: CabinetCell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push({
        id: `${r}-${c}`,
        row: r,
        col: c,
        width: 0.5,
        height: 0.5,
        pixelsX: 192,
        pixelsY: 192,
        pixelsTotal: px,
        powerW: 100,
        weightKg: 5
      } as unknown as CabinetCell);
    }
  }
  return out;
}

describe("buildPortGroups", () => {
  it("splits a row evenly when it exceeds port limit", () => {
    const cabs = makeCabinets(9, 1, 100000);
    const ports = buildPortGroups(cabs, 9, 1, 650000, "horizontal_rows", "left");
    expect(ports.length).toBe(2);
    const counts = ports.map(p => p.cabinets.length).sort();
    expect(counts).toEqual([4, 5]);
  });

  it("keeps a small row in one port", () => {
    const cabs = makeCabinets(3, 1, 36864);
    const ports = buildPortGroups(cabs, 3, 1, 650000, "horizontal_rows", "left");
    expect(ports.length).toBe(1);
    expect(ports[0].cabinets.length).toBe(3);
  });
});
