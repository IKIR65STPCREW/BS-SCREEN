import { useEffect, useState } from "react";
import type { ProjectConfig, SavedProject } from "../types";
import {
  deleteProject,
  duplicateProject,
  listProjects,
  saveProject
} from "../utils/storage";

interface Props {
  open: boolean;
  onClose: () => void;
  config: ProjectConfig;
  currentId: string | null;
  onLoad: (project: SavedProject) => void;
  onSaved: (id: string) => void;
}

export function ProjectManager({ open, onClose, config, currentId, onLoad, onSaved }: Props) {
  const [projects, setProjects] = useState<SavedProject[]>([]);

  const refresh = () => setProjects(listProjects());
  useEffect(() => { if (open) refresh(); }, [open]);

  if (!open) return null;

  // Ошибки записи в localStorage (переполнение и т.п.) показываем пользователю.
  const safe = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
    refresh();
  };

  const handleSave = () =>
    safe(() => {
      const p = saveProject(config, currentId ?? undefined);
      onSaved(p.id);
    });
  const handleSaveAsNew = () =>
    safe(() => {
      const p = saveProject(config);
      onSaved(p.id);
    });
  const handleDelete = (id: string) => {
    if (confirm("Удалить проект?")) safe(() => deleteProject(id));
  };
  const handleDuplicate = (id: string) => safe(() => duplicateProject(id));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Проекты</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-actions">
          <button className="btn primary" onClick={handleSave}>
            {currentId ? "Сохранить (перезаписать)" : "Сохранить новый"}
          </button>
          {currentId && (
            <button className="btn" onClick={handleSaveAsNew}>Сохранить как новый</button>
          )}
        </div>

        <div className="project-list">
          {projects.length === 0 && (
            <div className="empty">Нет сохранённых проектов.</div>
          )}
          {projects.map((p) => (
            <div key={p.id} className={`project-item ${p.id === currentId ? "active" : ""}`}>
              <div className="project-info">
                <div className="project-name">{p.config.projectName || "Без названия"}</div>
                <div className="project-meta">
                  {(p.config.screens?.length ?? 0)} экр. · {" "}
                  {new Date(p.updatedAt).toLocaleString("ru-RU")}
                </div>
              </div>
              <div className="project-actions">
                <button className="btn small" onClick={() => onLoad(p)}>Загрузить</button>
                <button className="btn small" onClick={() => handleDuplicate(p.id)}>Копия</button>
                <button className="btn small danger" onClick={() => handleDelete(p.id)}>×</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
