import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MoreHorizontal, Trash2, Sparkles, Pencil, GripVertical } from "lucide-react";
import TaskCard from "./TaskCard";
import ConfirmDialog from "../ui/ConfirmDialog";
import { cn, columnAccent } from "../../lib/utils";

const COLUMN_COLORS = [
  { value: "", label: "По умолчанию" },
  { value: "#f43f5e", label: "Розовый" },
  { value: "#f59e0b", label: "Оранжевый" },
  { value: "#0ea5e9", label: "Голубой" },
  { value: "#8b5cf6", label: "Фиолетовый" },
  { value: "#10b981", label: "Зеленый" },
  { value: "#ec4899", label: "Розовый (яркий)" },
];

const Column = ({ column, tasks, index = 0, isDesktop = true, onTaskClick, onAddTask, onRename, onDelete, onAiGenerate, isActive, onActivate }) => {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: column.id, data: { type: "column", column } });
  
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({
    id: `column-${column.id}`,
    data: { type: "column-drag", column },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition ? `${transition}, background-color 0.2s` : undefined,
    // Убираем лишние эффекты, оставляем только то, что нужно для dnd-kit
  };

  const accent = column.color 
    ? { dot: column.color, soft: `${column.color}15`, ring: `${column.color}40` } 
    : columnAccent(column.id);
    
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [title, setTitle] = useState(column.title);
  const menuRef = useRef(null);
  const colorMenuRef = useRef(null);

  useEffect(() => setTitle(column.title), [column.title]);
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target)) setColorMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const commitRename = () => {
    setEditing(false);
    const t = title.trim();
    if (t && t !== column.title) onRename(column.id, t);
    else setTitle(column.title);
  };

  return (
    <div
      ref={setSortableRef}
      data-column-id={column.id}
      style={{ ...style, backgroundColor: isOver ? accent.ring : accent.soft, ...(isOver ? { "--tw-ring-color": accent.ring } : {}) }}
      onClick={(e) => {
        // На десктопе клик по колонке делает её активной
        if (isDesktop) onActivate();
      }}
      className={cn(
        "flex h-full w-[330px] shrink-0 flex-col rounded-2xl p-2.5 transition-all duration-200",
        isOver && "ring-2 ring-inset", 
        isActive && isDesktop && "ring-2 ring-brand-500/50",
        isDragging && "opacity-50"
      )}
    >
    {/* Header */}
      <div 
        data-drag-handle 
        className="mb-2 flex items-center gap-2 px-1.5 pt-1 relative touch-none"
        {...(!isDesktop ? (attributes || {}) : {})}
        {...(!isDesktop ? (listeners || {}) : {})}
      >
        <button
          onClick={() => setColorMenuOpen((o) => !o)}
          className="h-3.5 w-3.5 shrink-0 rounded-full cursor-pointer ring-2 ring-transparent hover:ring-brand-500 transition-all z-10"
          style={{ backgroundColor: accent.dot }}
          title="Изменить цвет"
        />

        {colorMenuOpen && (
          <div ref={colorMenuRef} className="absolute top-6 left-0 z-50 flex w-32 flex-wrap gap-1.5 rounded-xl bg-surface p-2 shadow-[var(--shadow-lift)] border border-line">
            {COLUMN_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  onRename(column.id, column.title, c.value || null);
                  setColorMenuOpen(false);
                }}
                className="h-6 w-6 rounded-full border border-line ring-2 ring-transparent hover:ring-brand-500 transition-all"
                style={{ backgroundColor: c.value || "#e5e7eb" }}
                title={c.label}
              />
            ))}
          </div>
        )}

        <div 
          {...(attributes || {})} 
          {...(listeners || {})} 
          className="flex cursor-grab items-center gap-1 p-1 text-faint hover:bg-surface-2 hover:text-ink rounded-md"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => e.key === "Enter" && commitRename()}
            className="w-full rounded bg-surface px-2 py-0.5 text-sm font-semibold outline-none"
          />
        ) : (
          <h3 className="cursor-text font-display text-[15px] font-bold tracking-tight text-ink" onDoubleClick={() => setEditing(true)}>
            {column.title}
          </h3>
        )}
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold tabular text-muted shadow-[var(--shadow-card)]">
          {tasks.length}
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={() => onAddTask(column.id)}
            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-surface hover:text-ink"
            title="Добавить задачу"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-lg p-1.5 text-faint transition-colors hover:bg-surface hover:text-ink"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="card animate-in absolute right-0 z-10 mt-1 w-44 rounded-2xl p-1.5 shadow-[var(--shadow-lift)]">
                <MenuItem icon={Sparkles} onClick={() => { setMenuOpen(false); onAiGenerate(column.id); }}>
                  Создать с ИИ
                </MenuItem>
                <MenuItem icon={Pencil} onClick={() => { setMenuOpen(false); setEditing(true); }}>
                  Переименовать
                </MenuItem>
                <div className="my-1 border-t" />
                <MenuItem icon={Trash2} danger onClick={() => { setMenuOpen(false); setConfirmOpen(true); }}>
                  Удалить колонку
                </MenuItem>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div 
        ref={setDroppableRef} 
        className={cn(
          "flex flex-1 flex-col gap-2.5 px-0.5 pb-1 no-scrollbar",
          isDesktop 
            ? (isActive ? "overflow-y-auto touch-pan-y" : "overflow-y-hidden") 
            : "overflow-y-auto touch-pan-y"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onClick={onTaskClick} 
              isDoneColumn={["готово", "done", "выполнено", "завершено"].includes(column.title.toLowerCase().trim())}
            />
          ))}
        </SortableContext>

        <button
          onClick={() => onAddTask(column.id)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line/80 bg-surface/40 py-2.5 text-xs font-medium text-faint transition-colors hover:border-ink/20 hover:bg-surface hover:text-muted"
        >
          <Plus className="h-3.5 w-3.5" /> Добавить задачу
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { onDelete(column.id); setConfirmOpen(false); }}
        title="Удалить колонку?"
        description={`«${column.title}» и все её задачи будут безвозвратно удалены. Это действие нельзя отменить.`}
        confirmLabel="Удалить колонку"
        danger
      />
    </div>
  );
};

const MenuItem = ({ icon: Icon, children, onClick, danger }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-surface-2",
      danger ? "text-priority-urgent" : "text-muted hover:text-ink"
    )}
  >
    <Icon className="h-3.5 w-3.5" /> {children}
  </button>
);

export default Column;