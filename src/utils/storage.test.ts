import { describe, it, expect, beforeEach } from "vitest";
import { saveProject, listProjects, setCurrentId } from "./storage";
import { makeDefaultConfig } from "./defaults";

function stubStorage(failWrites: boolean) {
  const data = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (failWrites) throw new DOMException("quota", "QuotaExceededError");
      data.set(k, v);
    },
    removeItem: (k: string) => data.delete(k)
  };
}

describe("storage", () => {
  beforeEach(() => stubStorage(false));

  it("сохраняет и читает проект", () => {
    saveProject(makeDefaultConfig());
    expect(listProjects()).toHaveLength(1);
  });

  it("при переполнении хранилища — понятная ошибка, setCurrentId не падает", () => {
    stubStorage(true);
    expect(() => saveProject(makeDefaultConfig())).toThrow(/не сохранён/);
    expect(() => setCurrentId("x")).not.toThrow();
  });
});
