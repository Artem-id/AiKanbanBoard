import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, format, isSameMonth, isToday,
} from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, ArrowUpRight } from "lucide-react";
import { useLayout } from "../components/layout/AppLayout";
import { useWorkspace } from "../hooks/useWorkspace";
import Topbar from "../components/layout/Topbar";
import Modal from "../components/ui/Modal";
import { cn, priorityMeta } from "../lib/utils";

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const isDone = (t) => {
  const colTitle = (t.column_title || t.status || "").toLowerCase().trim();
  return ["готово", "done", "выполнено", "завершено", "успешно", "closed"].includes(colTitle);
};

const Calendar = () => {
  const { openCreateBoard } = useLayout();
  const { tasks, loading } = useWorkspace();
  const [cursor, setCursor] = useState(() => new Date());
  
  // Состояние для модального окна со списком задач на день
  const [selectedDay, setSelectedDay] = useState(null);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const key = format(new Date(t.due_date), "yyyy-MM-dd");
      (map[key] ||= []).push(t);
    });
    // Сортируем задачи внутри дня по приоритету
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => {
        const pA = priorityMeta(a.priority).label;
        const pB = priorityMeta(b.priority).label;
        return pA.localeCompare(pB);
      });
    });
    return map;
  }, [tasks]);

  const monthCount = useMemo(
    () => tasks.filter((t) => t.due_date && isSameMonth(new Date(t.due_date), cursor)).length,
    [tasks, cursor]
  );

  // Получаем задачи для выбранного дня
  const selectedTasks = selectedDay ? byDay[format(selectedDay, "yyyy-MM-dd")] || [] : [];

  return (
    <>
      <Topbar title="Календарь" subtitle="Задачи по сроку выполнения" onCreateBoard={openCreateBoard} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8 md:py-8">
          {/* Toolbar */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Левая часть: Месяц и счетчик */}
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                {format(cursor, "LLLL yyyy", { locale: ru })}
              </h2>
              <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-medium tabular text-muted">
                {monthCount} с дедлайном
              </span>
            </div>

            {/* Правая часть: Кнопки навигации */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCursor(new Date())}
                className="h-9 rounded-full border border-line bg-surface px-4 text-xs font-semibold text-ink shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-soft)]"
              >
                Сегодня
              </button>
              <button
                onClick={() => setCursor((c) => subMonths(c, 1))}
                className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-muted shadow-[var(--shadow-card)] transition-all duration-200 hover:text-ink hover:shadow-[var(--shadow-soft)]"
                title="Предыдущий месяц"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCursor((c) => addMonths(c, 1))}
                className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-muted shadow-[var(--shadow-card)] transition-all duration-200 hover:text-ink hover:shadow-[var(--shadow-soft)]"
                title="Следующий месяц"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="skeleton h-[640px] rounded-3xl" />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-card)]">
              {/* Weekday header */}
              <div className="grid grid-cols-7 border-b bg-surface-2/50">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
                    <span className="hidden sm:inline">{d}</span>
                    <span className="sm:hidden">{d[0]}</span>
                  </div>
                ))}
              </div>
              {/* Day grid */}
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const items = byDay[key] || [];
                  const inMonth = isSameMonth(day, cursor);
                  const today = isToday(day);
                  return (
                    <div
                      key={key}
                      onClick={() => items.length > 0 && setSelectedDay(day)}
                      className={cn(
                        "min-h-[72px] sm:min-h-[116px] border-b border-r p-1.5 sm:p-2 last:border-r-0 [&:nth-child(7n)]:border-r-0 transition-colors",
                        !inMonth && "bg-surface-2/30",
                        items.length > 0 && "cursor-pointer hover:bg-surface-2/50"
                      )}
                    >
                      <div className="mb-1 flex justify-end">
                        <span
                          className={cn(
                            "grid h-6 w-6 place-items-center rounded-full text-[12px] font-semibold tabular",
                            today ? "bg-brand-500 text-white" : inMonth ? "text-ink" : "text-faint"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                      </div>
                      <div className="flex flex-wrap content-start gap-1 sm:block sm:space-y-1">
                        {items.slice(0, 3).map((t) => (
                          <div
                            key={t.id}
                            title={`${t.title} · ${t.board_title}`}
                            className={cn(
                              "flex items-center gap-1.5 rounded-md sm:bg-surface-2 sm:px-1.5 sm:py-1 text-[11px] font-medium transition-colors sm:hover:bg-elevated",
                              isDone(t) ? "text-faint line-through" : "text-ink"
                            )}
                          >
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: priorityMeta(t.priority).color }}
                            />
                            {/* Скрываем текст на мобильных, показываем на sm и выше */}
                            <span className="hidden sm:inline truncate">{t.title}</span>
                          </div>
                        ))}
                        {items.length > 3 && (
                          <p className="px-1.5 text-[10px] font-medium text-faint hover:text-brand-500 transition-colors">
                            +{items.length - 3} ещё
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2 text-xs text-muted">
              <CalendarDays className="h-3.5 w-3.5" /> Цвет точки = приоритет
            </span>
            {["low", "medium", "high", "urgent"].map((p) => {
              const m = priorityMeta(p);
              return (
                <span key={p} className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} /> {m.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Модальное окно со списком задач на выбранный день */}
      <Modal
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? format(selectedDay, "d MMMM yyyy", { locale: ru }) : ""}
        description={`Задачи на этот день (${selectedTasks.length})`}
        size="md"
      >
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {selectedTasks.map((t) => (
            <Link
              key={t.id}
              to={`/board/${t.board_id}?task=${t.id}`}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-soft)]"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: priorityMeta(t.priority).color }}
              />
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "truncate text-sm font-semibold tracking-tight transition-colors",
                  isDone(t) ? "text-faint line-through" : "text-ink"
                )}>
                  {t.title}
                </p>
                <p className="mt-0.5 text-[11px] text-faint">{t.board_title}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-faint opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand-500 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default Calendar;