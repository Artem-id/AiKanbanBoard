import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  LayoutGrid,
  Users,
  CheckSquare,
  Sparkles,
  ArrowUpRight,
  BarChart3,
  PieChart,
  Clock,
  FolderKanban,
  Crown,
  Share2,
  AlertTriangle
} from "lucide-react";
import { useBoards } from "../context/BoardsContext";
import { useAuth } from "../context/AuthContext";
import { useLayout } from "../components/layout/AppLayout";
import Topbar from "../components/layout/Topbar";
import Button from "../components/ui/Button";
import { BoardCardSkeleton } from "../components/ui/Skeleton";
import { boardApi } from "../lib/api";
import { cn, relativeTime, priorityMeta } from "../lib/utils";


const Dashboard = () => {
  const { boards, loading } = useBoards();
  const [activeFilter, setActiveFilter] = useState("all");
  const [allTasks, setAllTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const { user } = useAuth();
  const { openCreateBoard } = useLayout();

 // Загружаем все задачи, только если нажата вкладка "Всего задач"
  useEffect(() => {
    if (activeFilter === "tasks") {
      setTasksLoading(true);
      Promise.all(boards.map(b => boardApi.get(b.id).catch(() => null)))
        .then(results => {
          const tasks = [];
          results.forEach(res => {
            if (res && res.tasks) tasks.push(...res.tasks);
          });
          setAllTasks(tasks);
        })
        .finally(() => setTasksLoading(false));
    }
  }, [activeFilter, boards]);

  const stats = useMemo(() => {
    const totalTasks = boards.reduce(
      (sum, b) => sum + Number(b.task_count || 0),
      0,
    );
    const owned = boards.filter((b) => b.is_owner).length;
    const shared = boards.filter((b) => !b.is_owner).length;
    return { total: boards.length, totalTasks, owned, shared };
  }, [boards]);

  // Отфильтрованные доски в зависимости от клика
  const displayedBoards = useMemo(() => {
    if (activeFilter === "owned") return boards.filter((b) => b.is_owner);
    if (activeFilter === "shared") return boards.filter((b) => !b.is_owner);
    return boards;
  }, [boards, activeFilter]);

  // Статистика по приоритетам для графика задач
  const priorityStats = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, urgent: 0 };
    allTasks.forEach(t => {
      if (counts[t.priority] !== undefined) counts[t.priority]++;
    });
    return counts;
  }, [allTasks]);

  const topBoards = useMemo(
    () =>
      [...displayedBoards]
        .sort((a, b) => Number(b.task_count || 0) - Number(a.task_count || 0))
        .slice(0, 7),
    [displayedBoards],
  );

  const recentBoards = useMemo(
    () =>
      [...displayedBoards]
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, 4),
    [displayedBoards],
  );

  const avgPerBoard = stats.total
    ? Math.round(stats.totalTasks / stats.total)
    : 0;
  const ownedPct = stats.total
    ? Math.round((stats.owned / stats.total) * 100)
    : 0;

  // Real per-board task distributions feeding the KPI mini bar charts.
  const trends = useMemo(() => {
    const sizes = boards.map((b) => Number(b.task_count || 0));
    return {
      boards: sizes,
      tasks: [...sizes].sort((a, b) => b - a),
      owned: boards
        .filter((b) => b.is_owner)
        .map((b) => Number(b.task_count || 0)),
      shared: boards
        .filter((b) => !b.is_owner)
        .map((b) => Number(b.task_count || 0)),
    };
  }, [boards]);

  return (
    <>
      <Topbar
        title="Дашборд"
        subtitle="Ваши доски и общие проекты"
        onCreateBoard={openCreateBoard}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Уменьшили px-6 до px-4 на мобильных */}
        <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-8">
          {/* Greeting */}
          <div className="mb-6 md:mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-500">
              Обзор рабочего пространства
            </p>
            <h2 className="mt-2 font-display text-[clamp(26px,3vw,34px)] font-semibold leading-tight tracking-tight">
              С возвращением, {user?.name?.split(" ")[0]} 👋
            </h2>
          </div>

          {/* KPIs */}
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            <KpiCard
              featured={activeFilter === "all"} 
              active={activeFilter === "all"} 
              onClick={() => setActiveFilter("all")}
              label="Всего досок" 
              value={stats.total} 
              hint="Во всем пространстве" 
              icon={FolderKanban}
            />
            <KpiCard
              featured={activeFilter === "tasks"} 
              active={activeFilter === "tasks"} 
              onClick={() => setActiveFilter("tasks")}
              label="Всего задач" 
              value={stats.totalTasks} 
              hint="По всем доскам" 
              icon={CheckSquare}
            />
            <KpiCard
              featured={activeFilter === "owned"} 
              active={activeFilter === "owned"} 
              onClick={() => setActiveFilter("owned")}
              label="Ваши доски" 
              value={stats.owned} 
              hint="Где вы владелец" 
              icon={Crown}
            />
            <KpiCard
              featured={activeFilter === "shared"}
              active={activeFilter === "shared"} 
              onClick={() => setActiveFilter("shared")}
              label="Доступные вам" 
              value={stats.shared} 
              hint="От вашей команды" 
              icon={Share2}
            />
          </div>

          {/* Insights — bento */}
          {loading || (activeFilter === "tasks" && tasksLoading) ? (
            <div className="mb-10 space-y-5">
              <div className="grid gap-5 grid-cols-1 lg:grid-cols-12">
                <div className="skeleton h-[300px] rounded-3xl lg:col-span-8" />
                <div className="skeleton h-[300px] rounded-3xl lg:col-span-4" />
              </div>
            </div>
          ) : boards.length > 0 ? (
            <div className="mb-10 space-y-5">
              {/* Верхний ряд графиков */}
              <div className="grid gap-5 grid-cols-1 lg:grid-cols-12">
                {activeFilter === "tasks" ? (
                  <TasksByPriority stats={priorityStats} total={allTasks.length} className="lg:col-span-8" />
                ) : (
                  <TasksByBoard boards={topBoards} className="lg:col-span-8" />
                )}
                
                <WorkspaceDonut
                  owned={displayedBoards.filter((b) => b.is_owner).length}
                  shared={displayedBoards.filter((b) => !b.is_owner).length}
                  boards={displayedBoards}
                  isTasksMode={activeFilter === "tasks"}
                  isSharedMode={activeFilter === "shared"}
                  isOwnedMode={activeFilter === "owned"}
                  allTasks={allTasks}
                  className="lg:col-span-4"
                />
              </div>
              
              {/* НИЖНИЙ РЯД: Возвращаем его для ВСЕХ вкладок */}
              <div className="grid gap-5 grid-cols-1 lg:grid-cols-12">
                <RecentBoards boards={recentBoards} className="lg:col-span-8" />
                <AIPromo onCreate={openCreateBoard} className="lg:col-span-4" />
              </div>
            </div>
          ) : null}

          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
              {activeFilter === "owned" ? "Ваши доски" : 
               activeFilter === "shared" ? "Доступные вам доски" : 
               "Все доски"}
            </h3>
            <Button size="sm" onClick={openCreateBoard}>
              <Plus className="h-4 w-4" /> Новая доска
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <BoardCardSkeleton key={i} />)}
            </div>
          ) : displayedBoards.length === 0 ? (
            <EmptyState onCreate={openCreateBoard} />
          ) : (
            <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {displayedBoards.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: (i % 6) * 0.05,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    to={`/board/${b.id}`}
                    className="group relative block h-full overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-soft)]"
                  >
                    {/* color accent strip */}
                    <span
                      className="absolute inset-x-0 top-0 h-1"
                      style={{ background: b.color || "#2f8159" }}
                    />
                    <div className="mb-3.5 flex items-start justify-between">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl"
                        style={{
                          backgroundColor: `${b.color || "#2f8159"}1f`,
                          color: b.color || "#2f8159",
                        }}
                      >
                        <LayoutGrid className="h-5 w-5" />
                      </div>
                      <span className="flex items-center gap-1.5 text-faint transition-all duration-200 group-hover:text-brand-500">
                        {!b.is_owner && (
                          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Общая
                          </span>
                        )}
                        <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                    <h4 className="font-display text-base font-semibold tracking-tight transition-colors group-hover:text-brand-600">
                      {b.title}
                    </h4>
                    <p className="mt-1.5 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted">
                      {b.description || "Без описания"}
                    </p>
                    <div className="mt-4 flex items-center gap-4 border-t pt-3.5 text-xs text-faint">
                      <span className="flex items-center gap-1.5 tabular">
                        <CheckSquare className="h-3.5 w-3.5" /> {b.task_count}{" "}
                        задачи
                      </span>
                      <span className="flex items-center gap-1.5 tabular">
                        <Users className="h-3.5 w-3.5" /> {b.member_count}
                      </span>
                      <span className="ml-auto">
                        {relativeTime(b.updated_at)}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Shared bits for the insight cards ─────────────────────────────────────
const SectionTitle = ({ icon: Icon, children, hint }) => (
  <div className="mb-5 flex items-center gap-2.5">
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <h3 className="font-display text-sm font-semibold tracking-tight">
        {children}
      </h3>
      {hint && <p className="truncate text-[11px] text-faint">{hint}</p>}
    </div>
  </div>
);

const EmptyHint = ({ icon: Icon, children }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
    <Icon className="h-6 w-6 text-faint" />
    <p className="max-w-[15rem] text-xs text-muted">{children}</p>
  </div>
);

const Legend = ({ color, label, value }) => (
  <div className="flex items-center gap-2.5">
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
    <span className="text-sm text-muted">{label}</span>
    <span className="ml-auto text-sm font-semibold tabular text-ink">
      {value}
    </span>
  </div>
);

// violet shade scaled to a bar's relative height — taller = deeper iris
const barShade = (pct) =>
  pct >= 0.8
    ? "#1d5038"
    : pct >= 0.5
      ? "#2f8159"
      : pct >= 0.25
        ? "#57a47b"
        : "#8bc4a4";

// ── Board analytics (vertical pill-bar chart + ranked breakdown) ──────────
// ── Board analytics (vertical pill-bar chart + ranked breakdown) ──────────
const TasksByBoard = ({ boards, className }) => {
  const max = Math.max(1, ...boards.map((b) => Number(b.task_count || 0)));
  const total = boards.reduce((s, b) => s + Number(b.task_count || 0), 0);
  const hasTasks = total > 0;
  
  const CHART_HEIGHT = 180; 

  return (
    <div
      className={cn(
        "flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <SectionTitle icon={BarChart3} hint="Задачи по активным доскам">
        Аналитика досок
      </SectionTitle>
      {hasTasks ? (
        <div className="mt-2 flex flex-1 flex-col gap-6 lg:flex-row">
          {/* bars */}
          {/* Убрали overflow-hidden, добавили pt-8 для тултипов, увеличили высоту */}
          <div className="flex w-full flex-1 items-end justify-between gap-2 pt-8 sm:gap-3" style={{ height: `${CHART_HEIGHT + 32}px` }}>
            {boards.map((b, i) => {
              const count = Number(b.task_count || 0);
              const pct = count / max;
              const color = b.color || "#2f8159";
              
              const barHeight = count > 0 ? Math.max((pct * CHART_HEIGHT * 0.7), 8) : 0;

              return (
                <Link
                  key={b.id}
                  to={`/board/${b.id}`}
                  title={`${b.title} · ${count} задач`}
                  className="group flex h-full flex-1 flex-col items-center justify-end gap-3 min-w-[24px]"
                >
                  <div className="relative flex w-full max-w-[44px] flex-1 items-end justify-center">
                    {count > 0 ? (
                      <>
                        {/* Тултип теперь сдвинут выше и не обрезается */}
                        <span className="absolute left-1/2 -top-8 z-10 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold tabular text-white opacity-0 shadow-[var(--shadow-soft)] transition-opacity duration-200 group-hover:opacity-100">
                          {count}
                        </span>
                        {/* Возвращаем motion.div для анимации */}
                        <motion.div
                          className="w-full rounded-full"
                          style={{ backgroundColor: barShade(pct) }}
                          initial={{ height: 0 }}
                          animate={{ height: `${barHeight}px` }}
                          transition={{
                            duration: 0.7,
                            delay: i * 0.06,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        />
                      </>
                    ) : (
                      <div className="hatch h-full w-full rounded-full border border-line" />
                    )}
                  </div>
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg font-display text-[11px] font-bold"
                    style={{ backgroundColor: `${color}22`, color }}
                  >
                    {b.title?.[0]?.toUpperCase() || "B"}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* ranked breakdown */}
          <div className="shrink-0 lg:w-[300px] lg:border-l lg:border-line lg:pl-6">
            <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
              Детализация
            </p>
            <div className="space-y-3">
              {boards.map((b) => {
                const count = Number(b.task_count || 0);
                const share = total ? Math.round((count / total) * 100) : 0;
                return (
                  <Link
                    key={b.id}
                    to={`/board/${b.id}`}
                    className="group flex items-center gap-2.5"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: b.color || "#2f8159" }}
                    />
                    <span className="flex-1 truncate text-[13px] font-medium text-ink transition-colors group-hover:text-brand-600">
                      {b.title}
                    </span>
                    <span className="text-[13px] font-semibold tabular text-ink">
                      {count}
                    </span>
                    <span className="w-9 text-right text-[11px] tabular text-faint">
                      {share}%
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <EmptyHint icon={BarChart3}>
          Пока нет задач - добавьте их, чтобы увидеть детализацию.
        </EmptyHint>
      )}
    </div>
  );
};

// ── Workspace composition (hand-built SVG donut) ──────────────────────────
const WorkspaceDonut = ({ owned, shared, boards = [], isTasksMode, isSharedMode, isOwnedMode, allTasks = [], className }) => {
  const adminCount = boards.filter(b => b.my_role === "admin").length;
  const memberCount = boards.filter(b => b.my_role === "member").length;
  
  const total = owned + shared;
  const R = 56;
  const SW = 16;
  const C = 2 * Math.PI * R;

  const isSharedModeLocal = isSharedMode; // для удобства
  const count1 = isSharedModeLocal ? adminCount : owned;
  const count2 = isSharedModeLocal ? memberCount : shared;
  
  const totalForChart = count1 + count2;
  const len1 = totalForChart ? (count1 / totalForChart) * C : 0;
  const len2 = totalForChart ? (count2 / totalForChart) * C : 0;

  
  // Статистика для режима задач
  const totalTasks = isTasksMode 
    ? allTasks.length 
    : boards.reduce((s, b) => s + Number(b.task_count || 0), 0);
  
  const avg = total ? Math.round(totalTasks / total) : 0;
  
  // Самая активная доска по задачам
  const busiestBoard = isTasksMode 
    ? [...boards].sort((a, b) => Number(b.task_count || 0) - Number(a.task_count || 0))[0]
    : boards.reduce((a, b) => (Number(b.task_count || 0) > Number(a?.task_count || 0) ? b : a), null);

  return (
    <div className={cn("flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]", className)}>
      <SectionTitle icon={isTasksMode ? CheckSquare : PieChart} hint={isTasksMode ? "Статистика задач" : "Список досок"}>
        {isTasksMode ? "Задачи" : "Состав"}
      </SectionTitle>
      
      {!isTasksMode && !isOwnedMode && (
        <div className="flex flex-col sm:flex-row items-center gap-5 mb-6">
          <div className="relative h-[128px] w-[128px] shrink-0 animate-scale-in">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
              <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-surface-2)" strokeWidth={SW} />
              {count1 > 0 && <circle cx="70" cy="70" r={R} fill="none" stroke="#2f8159" strokeWidth={SW} strokeDasharray={`${len1} ${C}`} />}
              {count2 > 0 && <circle cx="70" cy="70" r={R} fill="none" stroke="#8bc4a4" strokeWidth={SW} strokeDasharray={`${len2} ${C}`} strokeDashoffset={-len1} />}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-semibold tabular leading-none">{totalForChart}</span>
              <span className="mt-1 text-[10px] uppercase tracking-[0.1em] text-faint">доски</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 w-full">
            {isSharedMode ? (
              <>
                <Legend color="#2f8159" label="Админ" value={boards.filter(b => b.my_role === "admin").length} />
                <Legend color="#8bc4a4" label="Участник" value={boards.filter(b => b.my_role === "member").length} />
              </>
            ) : (
              <>
                <Legend color="#2f8159" label="Владелец" value={owned} />
                <Legend color="#8bc4a4" label="Общие" value={shared} />
              </>
            )}
          </div>

        </div>
      )}

      {/* СПИСОК ДОСОК ДЛЯ РЕЖИМА "ВАШИ ДОСКИ" */}
      {isOwnedMode && (
        <div className="flex flex-col gap-2 mb-4 max-h-[200px] overflow-y-auto pr-1">
          {boards.map(b => (
            <Link key={b.id} to={`/board/${b.id}`} className="group flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 transition-colors hover:bg-elevated">
              <span className="truncate text-sm font-medium text-ink group-hover:text-brand-600">{b.title}</span>
              <span className="text-xs text-muted">{b.task_count} задач</span>
            </Link>
          ))}
        </div>
      )}

      <div className={cn("grid gap-3.5", isTasksMode ? "mt-2" : "flex-1 content-center border-t pt-5")}>
        <StatRow label="Всего задач" value={totalTasks} />
        <StatRow label="В среднем на доску" value={avg} />
        
        {busiestBoard && Number(busiestBoard.task_count || 0) > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3">
            <span className="text-sm text-muted shrink-0">Самая активная доска</span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-ink max-w-[140px] sm:max-w-none">{busiestBoard.title}</span>
              <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium tabular text-muted">
                {busiestBoard.task_count}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const StatRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-sm text-muted">{label}</span>
    <span className="text-sm font-semibold tabular text-ink">{value}</span>
  </div>
);

// ── Recent boards (quick-jump rows) ───────────────────────────────────────
const RecentBoards = ({ boards, className }) => (
  <div
    className={cn(
      "flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]",
      className,
    )}
  >
    <SectionTitle icon={Clock} hint="Вернуться к работе">
      Вернуться к работе
    </SectionTitle>
    <div className="flex flex-col gap-0.5">
      {boards.map((b) => {
        const color = b.color || "#2f8159";
        return (
          <Link
            key={b.id}
            to={`/board/${b.id}`}
            className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2"
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl font-display text-[12px] font-bold"
              style={{ backgroundColor: `${color}22`, color }}
            >
              {b.title?.[0]?.toUpperCase() || "B"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink transition-colors group-hover:text-brand-600">
                {b.title}
              </p>
              <p className="text-[11px] text-faint">
                Обновлено {relativeTime(b.updated_at)}
              </p>
            </div>
            <span className="hidden items-center gap-1.5 text-[11px] font-medium tabular text-faint sm:flex">
              <Users className="h-3.5 w-3.5" /> {b.member_count}
            </span>
            <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium tabular text-muted">
              {b.task_count} задачи
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-faint opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand-500 group-hover:opacity-100" />
          </Link>
        );
      })}
    </div>
  </div>
);

// ── Mini bar chart for the KPI corner (per-board task distribution) ────────
const Sparkbars = ({ data, featured }) => {
  const bars = data.slice(-11);
  const max = Math.max(1, ...bars);
  const peak = Math.max(...bars);
  return (
    <div className="flex h-10 items-end gap-[3px]" aria-hidden="true">
      {bars.map((v, i) => (
        <span
          key={i}
          className={cn(
            "w-1.5 rounded-full",
            featured
              ? "bg-white/45"
              : v === peak
                ? "bg-brand-500"
                : "bg-brand-300",
          )}
          style={{ height: `${Math.max((v / max) * 100, 14)}%` }}
        />
      ))}
    </div>
  );
};

// ── KPI card (bento style — big number, icon medallion, contextual hint) ──
// ── Обновленный KpiCard ──
const KpiCard = ({ label, value, hint, featured, active, onClick, icon: Icon }) => (
  <button 
    onClick={onClick} 
    className={cn(
      "group relative overflow-hidden rounded-3xl p-5 text-left transition-all duration-300", 
      featured ? "brand-gradient text-white shadow-[var(--shadow-brand)]" : "border bg-surface text-ink hover:shadow-[var(--shadow-soft)]", 
      active && !featured ? "border-brand-500 ring-1 ring-brand-500" : "border-line"
    )}
  >
    {featured && (
      <>
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/15 blur-xl" />
        <div className="absolute -bottom-12 -left-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
      </>
    )}
    <div className="relative">
      <div className="mb-7 flex items-start justify-between gap-2">
        <span className={cn("text-[15px] font-medium", featured ? "text-white/90" : "text-ink")}>{label}</span>
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-2xl transition-colors duration-200", featured ? "bg-white/20 text-white" : "bg-brand-50 text-brand-600 group-hover:bg-brand-100")}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[40px] font-semibold leading-none tracking-tight tabular">{value}</p>
          {hint && <p className={cn("mt-3 text-xs", featured ? "text-white/75" : "text-muted")}>{hint}</p>}
        </div>
      </div>
    </div>
  </button>
);

// ── AI promo (gradient bento accent card) ─────────────────────────────────
const AIPromo = ({ onCreate, className }) => (
  <div
    className={cn(
      "brand-gradient relative flex flex-col justify-between overflow-hidden rounded-3xl p-6 text-white shadow-[var(--shadow-brand)]",
      className,
    )}
  >
    <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
    <div className="absolute -bottom-14 -left-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
    <div className="relative">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/20 backdrop-blur">
        <Sparkles className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
        Пусть ИИ спланирует спринт
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/80">
        Создать доску и превратить цель в приоритизированный бэклог за секунды.
      </p>
    </div>
    <button
      onClick={onCreate}
      className="relative mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-brand-700 shadow-[var(--shadow-card)] transition-transform duration-200 active:scale-[0.97]"
    >
      <Plus className="h-4 w-4" /> Новая доска
    </button>
  </div>
);

const EmptyState = ({ onCreate }) => (
  <div className="card flex flex-col items-center justify-center gap-4 rounded-3xl py-20 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
      <Sparkles className="h-7 w-7" />
    </div>
    <div>
      <h3 className="font-display text-lg font-semibold tracking-tight">
        Создать свою первую доску
      </h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
        Создайте доску и позвольте ИИ сгенерировать первые задачи из простой цели.
      </p>
    </div>
    <Button onClick={onCreate}>
      <Plus className="h-4 w-4" /> Новая доска
    </Button>
  </div>
);

// ── Новый график по приоритетам ──
const TasksByPriority = ({ stats, total, className }) => {
  const items = [
    { key: "urgent", label: "Срочные" },
    { key: "high", label: "Высокие" },
    { key: "medium", label: "Средние" },
    { key: "low", label: "Низкие" }
  ];

  return (
    <div className={cn("flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]", className)}>
      <SectionTitle icon={AlertTriangle} hint="Процент задач по срочности">
        Аналитика задач
      </SectionTitle>
      {total > 0 ? (
        <div className="mt-4 flex flex-1 flex-col justify-center gap-6">
          <div className="space-y-4">
            {items.map((item) => {
              const count = stats[item.key];
              const pct = total ? Math.round((count / total) * 100) : 0;
              const meta = priorityMeta(item.key);
              return (
                <div key={item.key} className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-muted">{item.label}</span>
                  <div className="flex-1 h-3 rounded-full bg-surface-2 overflow-hidden">
                    <motion.div 
                      className="h-full rounded-full" 
                      style={{ backgroundColor: meta.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7 }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-semibold tabular text-ink">{pct}%</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-center text-xs text-faint">Всего задач в пространстве: <strong className="text-ink">{total}</strong></p>
        </div>
      ) : (
        <EmptyHint icon={AlertTriangle}>Нет задач для отображения статистики.</EmptyHint>
      )}
    </div>
  );
};

export default Dashboard;