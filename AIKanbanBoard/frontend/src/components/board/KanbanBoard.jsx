import { useState, useMemo, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor,
  pointerWithin,
  closestCorners,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import Column from "./Column";
import TaskCard from "./TaskCard";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";

const positionForIndex = (siblings, index) => {
  const prev = index > 0 ? siblings[index - 1]?.position : null;
  const next = index < siblings.length ? siblings[index]?.position : null;
  if (prev == null && next == null) return 1000;
  if (prev == null) return next / 2;
  if (next == null) return prev + 1000;
  return (prev + next) / 2;
};

const KanbanBoard = ({ columns, tasks, actions, onTaskClick, onAddTask, onAiGenerate, onAddColumn }) => {
  const [activeTask, setActiveTask] = useState(null);
  const [activeColumnId, setActiveColumnId] = useState(null);
  const scrollRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  const handleWheel = (e) => {
    // На мобильных не перехватываем скролл
    if (!isDesktop) return;
    
    if (activeColumnId) return; 
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      // Если кликнули вне колонки (нет data-column-id), сбрасываем активную колонку
      if (!e.target.closest('[data-column-id]')) {
        setActiveColumnId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

    const sensors = useSensors(
    // Для мышки
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Для тач-экранов
    useSensor(TouchSensor, { 
      activationConstraint: { delay: 200, tolerance: 10 } // Увеличили задержку и допуск
    })
  );

  const tasksByColumn = useMemo(() => {
    const map = {};
    for (const col of columns) map[col.id] = [];
    for (const t of tasks) (map[t.column_id] ||= []).push(t);
    for (const id in map) map[id].sort((a, b) => a.position - b.position);
    return map;
  }, [columns, tasks]);

  const onDragStart = ({ active }) => {
    setActiveTask(tasks.find((t) => t.id === active.id) || null);
  };

  const onDragEnd = ({ active, over }) => {
    setActiveTask(null);
    if (!over) return;

    // 1. ЛОГИКА ДЛЯ КОЛОНОК
    if (active.data.current?.type === "column-drag") {
      if (active.id === over.id) return;
      
      const activeColId = active.data.current.column.id;
      const overColId = over.data.current?.column?.id || over.id.replace("column-", "");
      
      const oldIndex = columns.findIndex((c) => c.id === activeColId);
      const newIndex = columns.findIndex((c) => c.id === overColId);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const sortedCols = [...columns].sort((a, b) => a.position - b.position);
        const prev = sortedCols[newIndex - (newIndex > oldIndex ? 0 : 1)];
        const next = sortedCols[newIndex + (newIndex > oldIndex ? 1 : 0)];
        
        let newPos;
        if (!prev && !next) newPos = 1000;
        else if (!prev) newPos = next.position / 2;
        else if (!next) newPos = prev.position + 1000;
        else newPos = (prev.position + next.position) / 2;
        
        actions.moveColumn(activeColId, newPos);
      }
      return;
    }

        // 2. ЛОГИКА ДЛЯ ЗАДАЧ
    const activeId = active.id;
    const activeTaskObj = tasks.find((t) => t.id === activeId);
    if (!activeTaskObj) return;

    const overData = over.data.current;
    let targetColumnId;
    if (overData?.type === "column") targetColumnId = over.id;
    else if (overData?.type === "task") targetColumnId = overData.task.column_id;
    else targetColumnId = activeTaskObj.column_id;

    // ГЛАВНАЯ ПРАВКА: Если бросили в пустое место той же колонки — ничего не делаем
    if (activeTaskObj.column_id === targetColumnId && overData?.type !== "task") {
      return;
    }

    const siblings = (tasksByColumn[targetColumnId] || []).filter((t) => t.id !== activeId);

    let index;
    if (overData?.type === "task") {
      const overIndex = siblings.findIndex((t) => t.id === over.id);
      index = overIndex === -1 ? siblings.length : overIndex;
    } else {
      index = siblings.length; 
    }

    const newPosition = positionForIndex(siblings, index);

    // Если позиция не изменилась, тоже ничего не делаем
    if (activeTaskObj.column_id === targetColumnId && activeTaskObj.position === newPosition) {
      return;
    }

    actions.moveTask(activeId, targetColumnId, newPosition);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveTask(null)}
      measuring={{
        droppable: { strategy: "always" },
      }}
    >
      <div ref={scrollRef} onWheel={handleWheel} className="flex h-full gap-4 overflow-x-auto px-4 pt-1 pb-2 md:gap-5 md:px-6">
        <SortableContext items={columns.map(c => `column-${c.id}`)} strategy={horizontalListSortingStrategy}>
          {columns.map((col, i) => (
            <Column
              key={col.id}
              column={col}
              index={i}
              isDesktop={isDesktop}
              tasks={tasksByColumn[col.id] || []}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
              onAiGenerate={onAiGenerate}
              onRename={(id, title, color) => actions.renameColumn(id, title, color)}
              onDelete={actions.deleteColumn}
              isActive={activeColumnId === col.id}
              onActivate={() => setActiveColumnId(col.id)}
            />
          ))}
        </SortableContext>

        <button
          onClick={onAddColumn}
          className="flex h-11 w-[300px] shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line text-sm font-medium text-faint transition-colors hover:border-brand-500/50 hover:bg-surface hover:text-muted"
        >
          <Plus className="h-4 w-4" /> Добавить колонку
        </button>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-[314px]">
            <TaskCard task={activeTask} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;