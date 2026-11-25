import { NavLink, useNavigate } from "react-router-dom";
import {
  Plus, LayoutDashboard, Zap, CheckSquare, Calendar, Users, Settings,
  ChevronLeft, ChevronRight, HelpCircle, LogOut, Sparkles, X,
} from "lucide-react";
import { useBoards } from "../../context/BoardsContext";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";
import { cn } from "../../lib/utils";

// Section eyebrow (hidden when collapsed)
const SectionLabel = ({ children, collapsed }) =>
  collapsed ? (
    <div className="mx-auto my-2 h-px w-6 bg-line" />
  ) : (
    <p className="px-4 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
      {children}
    </p>
  );

// A nav row that adapts to collapsed/expanded
const NavItem = ({ to, icon: Icon, label, collapsed, badge, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={({ isActive }) =>
      cn(
        "group relative flex h-11 items-center rounded-2xl text-sm font-medium transition-colors duration-200",
        collapsed ? "mx-auto w-11 justify-center" : "gap-3 px-3",
        isActive
          ? "bg-brand-50 font-semibold text-brand-700"
          : "text-muted hover:bg-surface-2 hover:text-ink"
      )
    }
  >
    {({ isActive }) => (
      <>
        {isActive && !collapsed && (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-500" />
        )}
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
        {!collapsed && badge != null && (
          <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold tabular text-bg">
            {badge}
          </span>
        )}
      </>
    )}
  </NavLink>
);

const Sidebar = ({ collapsed, onToggle, onCreateBoard, onCommand, mobileOpen, onMobileClose }) => {
  const { boards, loading } = useBoards();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // На мобильных всегда развернуто
  const isCollapsed = collapsed && !mobileOpen;
    // Функция для закрытия меню на мобильных
  const handleNavClick = () => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Мобильный оверлей (затемнение) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Само меню */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-surface transition-transform duration-300 ease-[var(--ease-spring)] md:inset-y-3 md:left-3 md:h-auto md:rounded-3xl md:border md:shadow-soft md:backdrop-blur-xl",
          isCollapsed ? "md:w-[72px]" : "md:w-[252px]",
          // Мобильная логика: выезжает слева
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "w-[280px]" // Ширина на мобильных
        )}
      >
        {/* Кнопка закрытия на мобильных */}
        <div className="flex h-16 items-center justify-between px-3.5 md:hidden">
          <div className="brand-gradient grid h-10 w-10 place-items-center rounded-2xl shadow-[var(--shadow-brand)]">
            <Zap className="h-5 w-5 fill-white text-white" />
          </div>
          <span className="flex-1 truncate pl-2 font-display text-[17px] font-bold tracking-tight text-ink">
            Flowboard
          </span>
          <button onClick={onMobileClose} className="p-2 text-faint hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Заголовок для десктопа */}
        <div className="hidden md:flex h-16 items-center gap-2.5 px-3.5">
          <div className="brand-gradient grid h-10 w-10 shrink-0 place-items-center rounded-2xl shadow-[var(--shadow-brand)]">
            <Zap className="h-5 w-5 fill-white text-white" />
          </div>
          {!isCollapsed && (
            <span className="flex-1 truncate font-display text-[17px] font-bold tracking-tight text-ink">
              Flowboard
            </span>
          )}
          {!isCollapsed && (
            <button
              onClick={onToggle}
              title="Collapse sidebar"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Развернуть (для десктопа) */}
        {isCollapsed && (
          <div className="hidden md:flex justify-center pb-1">
            <button
              onClick={onToggle}
              title="Expand sidebar"
              className="grid h-7 w-7 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Скроллируемая область меню */}
        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden pb-4">
          {/* Menu */}
          <SectionLabel collapsed={isCollapsed}>Меню</SectionLabel>
          <nav className="space-y-1 px-3">
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Дашборд" collapsed={isCollapsed} onClick={handleNavClick} />
            <NavItem to="/my-tasks" icon={CheckSquare} label="Мои задачи" collapsed={isCollapsed} onClick={handleNavClick} />
            <NavItem to="/calendar" icon={Calendar} label="Календарь" collapsed={isCollapsed} onClick={handleNavClick} />
            <NavItem to="/team" icon={Users} label="Команда" collapsed={isCollapsed} onClick={handleNavClick} />
          </nav>

          {/* Boards */}
          <div className={cn("mt-2 flex h-7 items-center", isCollapsed ? "justify-center" : "justify-between px-4")}>
            {!isCollapsed && (
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">Доски</span>
            )}
            <button
              onClick={onCreateBoard}
              title="Новая доска"
              className="rounded-md p-1 text-faint transition-colors hover:bg-surface-2 hover:text-brand-600"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

            <div className="mt-1 min-h-[120px] space-y-0.5 overflow-x-hidden px-3 pb-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={cn("flex h-10 items-center gap-3", isCollapsed ? "justify-center" : "px-1")}>
                  <div className="skeleton h-7 w-7 shrink-0 rounded-lg" />
                  {!isCollapsed && <div className="skeleton h-3 flex-1 rounded" />}
                </div>
              ))
            ) : boards.length === 0 ? (
              !isCollapsed && <p className="px-3 py-2 text-xs text-faint">Пока нет досок</p>
            ) : (
              boards.map((b) => {
                const color = b.color || "#2f8159";
                return (
                  <NavLink
                    key={b.id}
                    to={`/board/${b.id}`}
                    title={b.title}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      cn(
                        "flex h-10 items-center rounded-2xl text-sm transition-colors duration-200",
                        isCollapsed ? "mx-auto w-10 justify-center" : "gap-3 px-2",
                        isActive ? "bg-brand-50 font-medium text-brand-700" : "text-muted hover:bg-surface-2 hover:text-ink"
                      )
                    }
                  >
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg font-display text-[12px] font-bold"
                      style={{ backgroundColor: `${color}22`, color }}
                    >
                      {b.title?.[0]?.toUpperCase() || "B"}
                    </span>
                    {!isCollapsed && <span className="flex-1 truncate">{b.title}</span>}
                    {!isCollapsed && (
                      <span className="shrink-0 pr-1 text-[10px] font-medium tabular text-faint">{b.task_count}</span>
                    )}
                  </NavLink>
                );
              })
            )}
          </div>

          {/* General */}
          <SectionLabel collapsed={isCollapsed}>Основное</SectionLabel>
          <nav className="space-y-1 px-3">
            <NavItem to="/settings" icon={Settings} label="Настройки" collapsed={isCollapsed} onClick={handleNavClick} />
            <button
              onClick={onCommand}
              title={isCollapsed ? "Search & shortcuts" : undefined}
              className={cn(
                "group flex h-11 w-full items-center rounded-2xl text-sm font-medium text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-ink",
                isCollapsed ? "mx-auto w-11 justify-center" : "gap-3 px-3"
              )}
            >
              <HelpCircle className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="flex-1 truncate text-left">Помощь и поиск</span>}
            </button>
            <button
              onClick={() => { handleNavClick(); logout(); navigate("/login"); }}
              title={isCollapsed ? "Log out" : undefined}
              className={cn(
                "group flex h-11 w-full items-center rounded-2xl text-sm font-medium text-muted transition-colors duration-200 hover:bg-priority-urgent/10 hover:text-priority-urgent",
                isCollapsed ? "mx-auto w-11 justify-center" : "gap-3 px-3"
              )}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="flex-1 truncate text-left">Выйти</span>}
            </button>
          </nav>

          {/* Promo (expanded only) */}
          {!isCollapsed && (
            <div className="px-3 pt-3">
              <button
                onClick={onCreateBoard}
                className="brand-gradient relative w-full overflow-hidden rounded-2xl p-4 text-left text-white shadow-[var(--shadow-brand)]"
              >
                <div className="absolute -right-6 -top-8 h-20 w-20 rounded-full bg-white/15 blur-xl" />
                <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-white/20 backdrop-blur">
                  <Sparkles className="h-4 w-4" />
                </span>
                <p className="relative mt-3 font-display text-sm font-semibold tracking-tight">Планировать с ИИ</p>
                <p className="relative mt-0.5 text-[11px] leading-relaxed text-white/80">
                  Превратить цель в бэклог за секунду.
                </p>
              </button>
            </div>
          )}

          {/* User */}
          <div className="mx-3 mt-3 border-t" />
          <div className={cn("flex h-16 items-center", isCollapsed ? "justify-center px-2" : "gap-3 px-3.5")}>
            <Avatar name={user?.name} id={user?.id} src={user?.avatar_url} size="sm" className="shrink-0" />
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                <p className="truncate text-xs text-faint">{user?.email}</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;