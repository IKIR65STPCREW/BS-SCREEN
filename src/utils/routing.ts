import type { CabinetCell, PortGroup, SideName, SignalRoutingMode } from "../types";

/**
 * Группирует модули по портам NovaStar.
 *
 * ВАЖНО (требование заказчика): сигнал идёт ЛИБО горизонтально в линию,
 * ЛИБО вертикально в линию. НИКАКИХ соединений первого ряда со вторым
 * (никаких «змеек»). Поэтому поддерживаются только:
 *   - horizontal_rows:  каждый ряд — отдельная независимая линия;
 *   - vertical_columns: каждая колонка — отдельная независимая линия.
 * Значения snake_* приводятся к линейным аналогам (совместимость со старыми
 * сохранёнными проектами).
 *
 * Бюджет порта считается ПО ПИКСЕЛЯМ.
 *
 * Распределение равномерное: вместо жадного заполнения до лимита
 * кабинеты в линии делятся на нужное число портов так, чтобы нагрузка была
 * максимально равной по пикселям (без остатков на последнем порту).
 *
 * Соглашение: row=0 — нижний ряд, col=0 — левый столбец.
 */
export function buildPortGroups(
  cabinets: CabinetCell[],
  countX: number,
  countY: number,
  maxPixelsPerPort: number,
  mode: SignalRoutingMode,
  signalInputSide: SideName
): PortGroup[] {
  if (countX === 0 || countY === 0 || cabinets.length === 0) return [];

  const cellAt = (row: number, col: number): CabinetCell | undefined =>
    cabinets.find((c) => c.row === row && c.col === col);

  const rightToLeft = signalInputSide === "right";
  const topToBottom = signalInputSide === "top";

  const range = (n: number) => Array.from({ length: n }, (_, i) => i);
  const rangeRev = (n: number) => Array.from({ length: n }, (_, i) => n - 1 - i);

  const linearMode: "rows" | "columns" =
    mode === "vertical_columns" || mode === "snake_columns" ? "columns" : "rows";

  const lines: CabinetCell[][] = [];

  if (linearMode === "rows") {
    const rowOrder = topToBottom ? rangeRev(countY) : range(countY);
    const colOrder = rightToLeft ? rangeRev(countX) : range(countX);
    for (const row of rowOrder) {
      const line: CabinetCell[] = [];
      for (const col of colOrder) {
        const c = cellAt(row, col);
        if (c) line.push(c);
      }
      if (line.length) lines.push(line);
    }
  } else {
    const colOrder = rightToLeft ? rangeRev(countX) : range(countX);
    const rowOrder = topToBottom ? rangeRev(countY) : range(countY);
    for (const col of colOrder) {
      const line: CabinetCell[] = [];
      for (const row of rowOrder) {
        const c = cellAt(row, col);
        if (c) line.push(c);
      }
      if (line.length) lines.push(line);
    }
  }

  const ports: PortGroup[] = [];
  let portNumber = 1;

  const pushPort = (cells: CabinetCell[]) => {
    if (cells.length === 0) return;
    const pixels = cells.reduce((s, c) => s + c.pixelsTotal, 0);
    ports.push({
      portNumber: portNumber++,
      cabinets: cells,
      pixels,
      loadPercent: (pixels / maxPixelsPerPort) * 100,
      isOverLimit: pixels > maxPixelsPerPort
    });
  };

  // Равномерное распределение внутри каждой линии.
  // Делим кабинеты линии на минимально необходимое число портов
  // так, чтобы размеры портов отличались не больше чем на 1 кабинет.
  for (const line of lines) {
    if (line.length === 0) continue;
    const totalPixels = line.reduce((s, c) => s + c.pixelsTotal, 0);
    let portsForLine = Math.max(1, Math.ceil(totalPixels / maxPixelsPerPort));

    // Защита: если после деления какой-то порт всё же превысит лимит по пикселям
    // (редко, при очень разных модулях), увеличиваем число портов.
    while (portsForLine < line.length) {
      const base = Math.floor(line.length / portsForLine);
      const extra = line.length % portsForLine;
      let ok = true;
      let idx = 0;
      for (let p = 0; p < portsForLine; p++) {
        const count = base + (p < extra ? 1 : 0);
        const slice = line.slice(idx, idx + count);
        const px = slice.reduce((s, c) => s + c.pixelsTotal, 0);
        if (px > maxPixelsPerPort) { ok = false; break; }
        idx += count;
      }
      if (ok) break;
      portsForLine++;
    }

    const base = Math.floor(line.length / portsForLine);
    const extra = line.length % portsForLine;
    let idx = 0;
    for (let p = 0; p < portsForLine; p++) {
      const count = base + (p < extra ? 1 : 0);
      if (count <= 0) continue;
      pushPort(line.slice(idx, idx + count));
      idx += count;
    }
  }

  return ports;
}
