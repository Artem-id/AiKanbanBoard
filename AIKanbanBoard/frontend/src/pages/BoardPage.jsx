import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Sparkles, FileText, Users, Activity, Search, ChevronLeft, Pencil, Trash2, BarChart2, Filter } from "lucide-react";
import { useBoard } from "../hooks/useBoard";
import { useLayout } from "../components/layout/AppLayout";
import { aiApi } from "../lib/api";
import { PRIORITIES } from "../lib/utils";

import Topbar from "../components/layout/Topbar";
import Modal from "../components/ui/Modal";
import { Input, Textarea } from "../components/ui/Input";
import Button from "../components/ui/Button";
import { FilterSelect } from "../components/ui/Input";
import { AvatarStack } from "../components/ui/Avatar";
import Avatar from "../components/ui/Avatar";
import { ColumnSkeleton } from "../components/ui/Skeleton";
import PromptDialog from "../components/ui/PromptDialog";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import KanbanBoard from "../components/board/KanbanBoard";
import TaskModal from "../components/board/TaskModal";
import MembersModal from "../components/board/MembersModal";
import AIGenerateModal from "../components/ai/AIGenerateModal";
import AISummaryModal from "../components/ai/AISummaryModal";
import ActivityFeed from "../components/ActivityFeed";
import { createPortal } from "react-dom";

const COLUMN_COLORS = [
  { value: "", label: "По умолчанию" },
  { value: "#f43f5e", label: "Розовый" },
  { value: "#f59e0b", label: "Оранжевый" },
  { value: "#0ea5e9", label: "Голубой" },
  { value: "#8b5cf6", label: "Фиолетовый" },
  { value: "#10b981", label: "Зеленый" },
  { value: "#ec4899", label: "Розовый (яркий)" },
];

const BoardPage = () => {
  const { boardId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openCreateBoard } = useLayout();
  const b = useBoard(boardId);

  const [taskModal, setTaskModal] = useState({ open: false, task: null, columnId: null });
  const [aiGen, setAiGen] = useState({ open: false, columnId: null });
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [addColumnOpen, setAddColumnOpen] = useState(false);

  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [search, setSearch] = useState("");
  const [renameForm, setRenameForm] = useState({ title: "", description: "" });
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef(null);

  const [showFilters, setShowFilters] = useState(false);

  // Автооткрытие задачи при переходе по ссылке из уведомления
  useEffect(() => {
    const taskId = searchParams.get("task");
    if (taskId && b.tasks && b.tasks.length > 0) {
      const task = b.tasks.find((t) => t.id === taskId);
      if (task) {
        setTaskModal({ open: true, task, columnId: task.column_id });
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("task");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, b.tasks, setSearchParams]);

    useEffect(() => {
    const onClick = (e) => {
      // Если клик был вне контейнера с кнопкой и меню — закрываем
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filteredTasks = useMemo(() => {
    return b.tasks.filter((t) => {
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterAssignee && t.assignee_id !== filterAssignee) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !(t.description || "").toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [b.tasks, filterPriority, filterAssignee, search]);

  const handleBreakdown = async (task) => {
    try {
      const subtasks = await aiApi.breakdown(boardId, { taskId: task.id });
      for (const s of subtasks) {
        await b.createTask({
          column_id: task.column_id,
          title: s.title,
          description: s.description,
          priority: s.priority,
        });
      }
      toast.success(`Добавлено ${subtasks.length} подзадач`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const canManage = b.role === "owner" || b.role === "admin";

  if (b.error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold">Не удалось загрузить доску</p>
        <p className="text-muted">{b.error}</p>
        <Link to="/dashboard"><Button variant="outline">Вернуться к дашбордам</Button></Link>
      </div>
    );
  }

  const actions = (
    <div className="flex items-center gap-2">
      {/* Кнопка ИИ (только для десктопа от 1280px) */}
      <div className="hidden xl:flex">
        <Button size="sm" onClick={() => setAiGen({ open: true, columnId: b.columns[0]?.id })} className="px-2 sm:px-4">
          <Sparkles className="h-4 w-4" /> <span className="hidden lg:inline">Задачи ИИ</span>
        </Button>
      </div>

      {/* Кнопка "График" (только для мобильных и планшетов до 1280px) */}
      <div className="relative xl:hidden" ref={actionsMenuRef}>
        <button 
          onClick={() => setActionsMenuOpen((o) => !o)} 
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-[var(--shadow-card)] transition-all duration-200 hover:border-brand-300 hover:text-brand-500"
        >
          <BarChart2 className="h-5 w-5" />
        </button>
        
        {actionsMenuOpen && (
          <div 
            className="fixed left-4 right-4 top-[72px] z-[9999] flex flex-col rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-lift)] animate-in slide-in-from-top-2 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-56"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setAiGen({ open: true, columnId: b.columns[0]?.id }); setActionsMenuOpen(false); }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              <Sparkles className="h-4 w-4" /> Задачи ИИ
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setSummaryOpen(true); setActionsMenuOpen(false); }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              <FileText className="h-4 w-4" /> Резюме
            </button>
            <div className="my-1 border-t" />
            <button
              onClick={(e) => { e.stopPropagation(); setActivityOpen(true); setActionsMenuOpen(false); }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink"
            >
              <Activity className="h-4 w-4" /> Активность
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setMembersOpen(true); setActionsMenuOpen(false); }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink"
            >
              <Users className="h-4 w-4" /> Участники
            </button>
            {b.presence.length > 0 && (
              <div className="mt-2 border-t pt-2">
                <div className="flex w-full items-start gap-2 rounded-xl px-3 py-2">
                  <span className="text-[11px] font-medium text-faint pt-1 shrink-0">Смотрят:</span>
                  <div className="flex flex-wrap gap-1">
                    {b.presence.map((u) => (
                      <Avatar key={u.id} name={u.name} id={u.id} src={u.avatar_url} size="xs" />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Оригинальные кнопки для десктопа (от 1280px) */}
      <div className="hidden xl:flex items-center gap-2">
        {b.presence.length > 0 && (
          <div className="mr-1 flex items-center gap-2">
            <span className="text-[11px] text-faint">Смотрят:</span>
            <AvatarStack users={b.presence} size="xs" max={3} />
          </div>
        )}
        <Button size="sm" variant="ghost" onClick={() => setActivityOpen(true)} title="Активность">
          <Activity className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMembersOpen(true)} title="Участники">
          <Users className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setSummaryOpen(true)}>
          <FileText className="h-4 w-4" /> <span className="hidden lg:inline">Резюме</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Topbar
        title={
          <div className="flex items-center gap-2 group min-w-0 w-full">
            <Link to="/dashboard" className="text-faint hover:text-ink md:hidden shrink-0 -ml-1">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            {b.board ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: b.board.color }} />
                <span className="truncate font-semibold text-ink text-base">{b.board.title}</span>
                {(b.role === "owner" || b.role === "admin") && (
                  <button 
                    onClick={() => {
                      setRenameForm({ title: b.board?.title || "", description: b.board?.description || "" });
                      setRenameOpen(true);
                    }} 
                    className="ml-1 shrink-0 rounded-md p-1.5 text-faint hover:bg-surface-2 hover:text-ink"
                    title="Переименовать доску"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                {b.role === "owner" && (
                  <button 
                    onClick={() => setDeleteOpen(true)} 
                    className="shrink-0 rounded-md p-1.5 text-faint hover:bg-priority-urgent/10 hover:text-priority-urgent"
                    title="Удалить доску"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              "Загрузка…"
            )}
          </div>
        }
        subtitle={b.board?.description}
        actions={actions}
        onCreateBoard={openCreateBoard}
      />

{/* Filter bar (Мобильная версия) */}
      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            <Filter className="h-3.5 w-3.5" /> Фильтры
          </button>
          <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium tabular text-muted">
            {filteredTasks.length} задач
          </span>
        </div>
        {showFilters && (
          <div className="space-y-3 border-b border-line bg-surface p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск задач"
                className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-4 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex gap-2">
              <FilterSelect value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="flex-1">
                <option value="">Все приоритеты</option>
                {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </FilterSelect>
              <FilterSelect value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="flex-1">
                <option value="">Все исполнители</option>
                {b.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </FilterSelect>
            </div>
            {(filterPriority || filterAssignee || search) && (
              <button
                onClick={() => { setFilterPriority(""); setFilterAssignee(""); setSearch(""); }}
                className="w-full rounded-xl bg-surface-2 py-2 text-sm font-medium text-ink"
              >
                Сбросить
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filter bar (Десктопная версия) */}
      <div className="hidden md:flex flex-wrap items-center gap-2.5 px-6 py-3.5">
        <div className="relative w-full sm:w-auto">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск задач"
            className="h-9 w-full rounded-full border border-line bg-surface pl-9 pr-4 text-xs shadow-[var(--shadow-card)] outline-none transition-all duration-200 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/15 sm:w-52"
          />
        </div>
        <FilterSelect value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">Все приоритеты</option>
          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </FilterSelect>
        <FilterSelect value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
          <option value="">Все исполнители</option>
          {b.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </FilterSelect>
        {(filterPriority || filterAssignee || search) && (
          <button
            onClick={() => { setFilterPriority(""); setFilterAssignee(""); setSearch(""); }}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Сбросить
          </button>
        )}
        <span className="ml-auto rounded-full bg-surface-2 px-3 py-1 text-xs font-medium tabular text-muted">
          {filteredTasks.length} задач
        </span>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden pt-1">
        {b.loading ? (
          <div className="flex gap-4 px-6">
            {[0, 1, 2, 3].map((i) => <ColumnSkeleton key={i} />)}
          </div>
        ) : (
          <KanbanBoard
            columns={b.columns}
            tasks={filteredTasks}
            actions={b}
            onTaskClick={(task) => setTaskModal({ open: true, task, columnId: task.column_id })}
            onAddTask={(columnId) => setTaskModal({ open: true, task: null, columnId })}
            onAiGenerate={(columnId) => setAiGen({ open: true, columnId })}
            onAddColumn={() => setAddColumnOpen(true)}
          />
        )}
      </div>

      {/* Modals */}
      <TaskModal
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false, task: null, columnId: null })}
        task={taskModal.task}
        defaultColumnId={taskModal.columnId}
        columns={b.columns}
        members={b.members}
        actions={b}
        onBreakdown={handleBreakdown}
      />
      <AIGenerateModal
        open={aiGen.open}
        onClose={() => setAiGen({ open: false, columnId: null })}
        boardId={boardId}
        columns={b.columns}
        defaultColumnId={aiGen.columnId}
        onCreated={(tasks) => tasks.forEach(b.upsertTask)}
      />
      <AISummaryModal open={summaryOpen} onClose={() => setSummaryOpen(false)} boardId={boardId} />
      <MembersModal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        boardId={boardId}
        members={b.members}
        setMembers={b.setMembers}
        canManage={canManage}
        ownerId={b.board?.owner_id}
        currentUserRole={b.role}
      />
      <ActivityFeed open={activityOpen} onClose={() => setActivityOpen(false)} boardId={boardId} />

      {/* Модальное окно для СОЗДАНИЯ колонки */}
      <Modal
        open={addColumnOpen}
        onClose={() => setAddColumnOpen(false)}
        title="Добавить колонку"
        description="Дайте новой колонке название и выберите цвет."
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAddColumnOpen(false)}>Отмена</Button>
            <Button type="submit" form="add-column-form">Добавить</Button>
          </div>
        }
      >
        <form
          id="add-column-form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target;
            const title = form.title.value;
            const color = form.color.value;
            if (title.trim()) {
              b.addColumn(title.trim(), color || null);
            }
            setAddColumnOpen(false);
          }}
          className="space-y-4 pb-2"
        >
          <Input label="Название колонки" name="title" placeholder="Например: Бэклог" required autoFocus />
          <div>
            <label className="mb-2 block text-sm font-medium text-muted">Цвет колонки</label>
            <div className="flex flex-wrap gap-2">
              {COLUMN_COLORS.map((c) => (
                <label key={c.value} className="cursor-pointer">
                  <input type="radio" name="color" value={c.value} className="peer sr-only" defaultChecked={c.value === ""} />
                  <div 
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-line peer-checked:ring-2 peer-checked:ring-brand-500 peer-checked:ring-offset-2"
                    style={{ backgroundColor: c.value || "#e5e7eb" }}
                  >
                    {!c.value && <span className="text-[10px] font-bold text-muted">Авто</span>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Модальное окно для РЕДАКТИРОВАНИЯ доски */}
      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Редактировать доску"
        description="Измените название или описание вашей доски."
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>Отмена</Button>
            <Button type="submit" form="rename-board-form">Сохранить</Button>
          </div>
        }
      >
        <form
          id="rename-board-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (renameForm.title.trim()) {
              b.updateBoard({
                title: renameForm.title.trim(),
                description: renameForm.description.trim() || null,
              });
            }
            setRenameOpen(false);
          }}
          className="space-y-4 pb-2"
        >
          <Input
            label="Название доски"
            placeholder="Например: Планирование продукта"
            value={renameForm.title}
            onChange={(e) => setRenameForm({ ...renameForm, title: e.target.value })}
            autoFocus
            required
          />
          <Textarea
            label="Описание (необязательно)"
            rows={3}
            placeholder="О чем эта доска?"
            value={renameForm.description}
            onChange={(e) => setRenameForm({ ...renameForm, description: e.target.value })}
          />
        </form>
      </Modal>

      {/* Модальное окно для УДАЛЕНИЯ доски */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          b.deleteBoard();
          setDeleteOpen(false);
        }}
        title="Удалить доску?"
        description={`Вы уверены, что хотите удалить доску «${b.board?.title}»? Все её задачи и история будут безвозвратно удалены.`}
        confirmLabel="Удалить"
        danger
      />
    </>
  );
};

export default BoardPage;