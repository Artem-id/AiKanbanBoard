import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users, Crown, CheckSquare, AlertTriangle, ArrowUpRight, ListTodo, Plus, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLayout } from "../components/layout/AppLayout";
import { useWorkspace } from "../hooks/useWorkspace";
import { useBoards } from "../context/BoardsContext";
import { userApi } from "../lib/api";
import { boardApi } from "../lib/api";
import {Input} from "../components/ui/Input";

import Button from "../components/ui/Button";
import toast from "react-hot-toast";
import Topbar from "../components/layout/Topbar";
import Avatar from "../components/ui/Avatar";
import Modal from "../components/ui/Modal";
import UserSearchCombobox from "../components/ui/UserSearchCombobox";


const Team = () => {
  const { user } = useAuth();
  const { openCreateBoard } = useLayout();
  const { members, tasks, loading } = useWorkspace();
  const { onlineUsers } = useBoards();
  
  const [search, setSearch] = useState("");
  const [filterLoad, setFilterLoad] = useState(""); 
  const [sortBy, setSortBy] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  
    
  // Состояния для модалки добавления
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [foundUser, setFoundUser] = useState(null);
  const [selectedBoardId, setSelectedBoardId] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Получаем доски, где мы можем добавлять участников (владелец или админ)
  const { boards } = useBoards();
  const manageableBoards = boards.filter(b => b.is_owner || b.my_role === "admin");
  

  // 1. Функция подсчета
  const getUserStats = (userId) => {
    const userTasks = tasks.filter(t => t.assignee_id === userId);
    const active = userTasks.filter(t => {
      const col = (t.column_title || t.status || "").toLowerCase();
      return !["готово", "done", "выполнено", "завершено"].includes(col);
    }).length;
    const overdue = userTasks.filter(t => {
      const col = (t.column_title || t.status || "").toLowerCase();
      const isDone = ["готово", "done", "выполнено", "завершено"].includes(col);
      return !isDone && t.due_date && new Date(t.due_date) < new Date();
    }).length;
    
    return { total: userTasks.length, active, overdue };
  };

  // 2. Фильтрация и сортировка
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    
    let result = members.map(m => ({
      ...m,
      stats: getUserStats(m.id)
    }));

    if (q) {
      result = result.filter(
        (m) => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
      );
    }

    if (filterLoad === "overloaded") {
      result = result.filter((m) => m.stats.active > 3);
    } else if (filterLoad === "free") {
      result = result.filter((m) => m.stats.active === 0);
    }

    //Сортировка
    if (sortBy === "alpha_asc") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "alpha_desc") {
      result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    } else if (sortBy === "tasks_desc") {
      result.sort((a, b) => b.stats.active - a.stats.active);
    } else if (sortBy === "tasks_asc") {
      result.sort((a, b) => a.stats.active - b.stats.active);
    }

    return result;
  }, [members, tasks, search, filterLoad, sortBy]);

  //функция для расчета приоритетов выбранного пользователя
  const getPriorityStats = (userId) => {
    const userTasks = tasks.filter(t => t.assignee_id === userId);
    const activeTasks = userTasks.filter(t => {
      const col = (t.column_title || t.status || "").toLowerCase();
      return !["готово", "done", "выполнено", "завершено"].includes(col);
    });
    
    const counts = { urgent: 0, high: 0, medium: 0, low: 0 };
    activeTasks.forEach(t => {
      if (counts[t.priority] !== undefined) counts[t.priority]++;
    });
    return counts;
  };

    const handleAddToBoard = async () => {
    if (!foundUser || !selectedBoardId) return toast.error("Выберите доску");
    setIsAdding(true);
    try {
      await boardApi.addMember(selectedBoardId, { email: foundUser.email });
      toast.success(`${foundUser.name} добавлен(а) на доску!`);
      setAddMemberOpen(false);
      // Очищаем форму
      setFoundUser(null);
      setSelectedBoardId("");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsAdding(false);
    }
  };
  
  //кнопка сброса
  const handleReset = () => {
    setSearch("");
    setFilterLoad("");
    setSortBy("");
  };

  // Проверяем, есть ли активные фильтры
  const hasFilters = search !== "" || filterLoad !== "" || sortBy !== "";

  return (
    <>
      <Topbar title="Команда" subtitle="Люди на ваших досках" onCreateBoard={openCreateBoard} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-8">
          
          {/* Блок 1: Счетчик и Кнопка добавления */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium tabular text-muted">
              {filtered.length} пользователей
            </span>
            <button
              onClick={() => setAddMemberOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-full bg-brand-500 px-4 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
            >
              <Plus className="h-3.5 w-3.5" /> Добавить в команду
            </button>
          </div>

          {/* Блок 2: Поиск и Фильтры */}
          <div className="mb-6 flex flex-col gap-3">
            {/* Поиск на всю ширину на мобильных */}
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск"
                className="h-9 w-full rounded-full border border-line bg-surface pl-9 pr-4 text-xs shadow-[var(--shadow-card)] outline-none transition-all duration-200 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/15 sm:w-56"
              />
            </div>

            {/* Фильтры в ряд */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterLoad}
                onChange={(e) => setFilterLoad(e.target.value)}
                className="h-9 flex-1 sm:flex-none rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink shadow-[var(--shadow-card)] outline-none transition-all duration-200 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/15"
              >
                <option value="">Все сотрудники</option>
                <option value="overloaded">Перегружены</option>
                <option value="free">Свободны</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 flex-1 sm:flex-none rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink shadow-[var(--shadow-card)] outline-none transition-all duration-200 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/15"
                >
                <option value="">Без сортировки</option>
                <option value="alpha_asc">По алфавиту (А-Я)</option>
                <option value="alpha_desc">По алфавиту (Я-А)</option>
                <option value="tasks_desc">По задачам (много → мало)</option>
                <option value="tasks_asc">По задачам (мало → много)</option>
              </select>

              {hasFilters && (
                <button
                  onClick={handleReset}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  Сбросить
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-44 rounded-3xl" />)}
            </div>
          ) : members.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-3 rounded-3xl py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                <Users className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight">Пока нет коллег</h3>
                <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
                  Пригласите людей на доску, и они появятся здесь.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedUser(m)}
                  className="flex flex-col items-center rounded-3xl border border-line bg-surface p-6 text-center shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-soft)]"
                >
                  <div className="relative">
                    <Avatar name={m.name} id={m.id} src={m.avatar_url} size="lg" className="h-16 w-16 text-lg" />
                    {onlineUsers.has(m.id) && (
                      <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-surface shadow-sm" title="Онлайн" />
                    )}
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 font-display text-base font-semibold tracking-tight">
                    {m.name}
                    {m.id === user?.id && <span className="text-[11px] font-medium text-faint">(Вы)</span>}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Чтобы не открывалась модалка при клике на email
                      navigator.clipboard.writeText(m.email);
                      toast.success("Email скопирован");
                    }}
                    className="mt-0.5 max-w-full truncate text-xs text-muted hover:text-brand-500 transition-colors"
                    title="Скопировать email"
                  >
                    {m.email}
                  </button>
                  
                  {/* Метрики задач (используем m.stats) */}
                  <div className="mt-3 flex w-full items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                      <CheckSquare className="h-3.5 w-3.5" /> {m.stats.active} в работе
                    </span>
                    {m.stats.overdue > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-priority-urgent/10 px-2.5 py-1 text-[11px] font-semibold text-priority-urgent">
                        <AlertTriangle className="h-3.5 w-3.5" /> {m.stats.overdue} просрочено
                      </span>
                    )}
                  </div>
                  
                  <p className="mt-3 border-t pt-3 text-[11px] text-faint" style={{ width: "100%" }}>
                    На {m.boards.length} {m.boards.length === 1 ? "доске" : "досках"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    
          {/* Модальное окно профиля пользователя */}
      <Modal
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="Профиль сотрудника"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* Шапка */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar name={selectedUser.name} id={selectedUser.id} src={selectedUser.avatar_url} size="lg" className="h-16 w-16 text-lg" />
                {onlineUsers.has(selectedUser.id) && (
                  <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-surface shadow-sm" title="Онлайн" />
                )}
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold">{selectedUser.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(selectedUser.email);
                    toast.success("Email скопирован");
                  }}
                  className="text-sm text-muted hover:text-brand-500 transition-colors"
                  title="Скопировать email"
                >
                  {selectedUser.email}
                </button>
              </div>
            </div>

            {/* Статистика по приоритетам */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-ink">Активные задачи по приоритету</h4>
              <div className="space-y-3">
                {(() => {
                  const pStats = getPriorityStats(selectedUser.id);
                  const total = Object.values(pStats).reduce((a, b) => a + b, 0);
                  const items = [
                    { key: "urgent", label: "Срочные", color: "#e11d48" },
                    { key: "high", label: "Высокие", color: "#ea580c" },
                    { key: "medium", label: "Средние", color: "#d97706" },
                    { key: "low", label: "Низкие", color: "#0ea5e9" }
                  ];
                  
                  return items.map(item => {
                    const count = pStats[item.key];
                    const pct = total ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={item.key} className="flex items-center gap-3">
                        <span className="w-20 text-xs text-muted">{item.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                        </div>
                        <span className="w-8 text-right text-xs font-medium text-ink">{count}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Доски */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-ink">Состоит на досках</h4>
              <div className="flex flex-wrap gap-2">
                {selectedUser.boards.map((bTitle, idx) => (
                  <span key={idx} className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
                    {bTitle}
                  </span>
                ))}
              </div>
            </div>

            {/* Текущие задачи */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-ink">Текущие задачи</h4>
              <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
                {tasks.filter(t => {
                  if (t.assignee_id !== selectedUser.id) return false;
                  const col = (t.column_title || t.status || "").toLowerCase();
                  return !["готово", "done", "выполнено", "завершено"].includes(col);
                }).map(t => (
                  <Link
                    key={t.id}
                    to={`/board/${t.board_id}?task=${t.id}`}
                    onClick={() => setSelectedUser(null)}
                    className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:bg-surface-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{t.title}</p>
                      <p className="text-[11px] text-faint">{t.board_title} • {t.status}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-faint group-hover:text-brand-500" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

            {/* Модалка добавления в команду */}
      <Modal
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        title="Добавить в команду"
        description="Найдите пользователя по email и добавьте его на доску."
      >
        <div className="space-y-3">
          <UserSearchCombobox 
            onSelect={(user) => {
              setFoundUser(user);
              setAddEmail(user.email);
            }} 
          />
          {/* Если пользователь уже выбран, показываем карточку и выбор доски */}
          {foundUser && (
            <div className="rounded-xl border border-line bg-surface-2 p-3">
              <p className="text-sm font-semibold">{foundUser.name}</p>
              <p className="text-xs text-muted">{foundUser.email}</p>
                
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-muted">Выберите доску для добавления:</label>
                <select
                  value={selectedBoardId}
                  onChange={(e) => setSelectedBoardId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  <option value="">-- Выберите доску --</option>
                  {manageableBoards.map(b => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </div>

              <Button 
                onClick={handleAddToBoard} 
                loading={isAdding} 
                disabled={!selectedBoardId}
                className="mt-3 w-full"
              >
                Добавить на доску
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default Team;