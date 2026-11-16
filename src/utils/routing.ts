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

  // Равномерное распределение внутри каждой линии (ряда или колонки).
  for (const line of lines) {
    if (line.length === 0) continue;
    const totalPixels = line.reduce((s, c) => s + c.pixelsTotal, 0);
    const portsForLine = Math.max(1, Math.ceil(totalPixels / maxPixelsPerPort));
    const targetPerPort = Math.ceil(totalPixels / portsForLine);

    let current: CabinetCell[] = [];
    let curPixels = 0;

    for (let i = 0; i < line.length; i++) {
      const cell = line[i];
      const wouldExceed = current.length > 0 && curPixels + cell.pixelsTotal > targetPerPort;
      // Если превышаем цель и ещё остались кабинеты — закрываем порт
      if (wouldExceed) {
        pushPort(current);
        current = [];
        curPixels = 0;
      }
      current.push(cell);
      curPixels += cell.pixelsTotal;
    }
    pushPort(current);
  }

  return ports;
}
