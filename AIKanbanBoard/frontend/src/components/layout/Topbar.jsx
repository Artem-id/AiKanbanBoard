import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronDown, LogOut, Plus, Search, Bell, Menu,
  AlertCircle, UserPlus, Shield, Info, CheckCheck, Trash2, Zap
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLayout } from "./AppLayout";
import { useNotifications } from "../../context/NotificationContext";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";

const groupNotifications = (notifications) => {
  const today = [];
  const yesterday = [];
  const older = [];
  
  const now = new Date();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayDate = todayDate - 86400000;

  notifications.forEach((n) => {
    const date = new Date(n.created_at).getTime();
    if (date >= todayDate) today.push(n);
    else if (date >= yesterdayDate) yesterday.push(n);
    else older.push(n);
  });

  return { today, yesterday, older };
};

const getIcon = (kind) => {
  switch (kind) {
    case "deadline": return <AlertCircle className="h-4 w-4 text-priority-urgent" />;
    case "assigned": return <Info className="h-4 w-4 text-brand-500" />;
    case "invite": return <UserPlus className="h-4 w-4 text-green-500" />;
    case "role_changed": return <Shield className="h-4 w-4 text-blue-500" />;
    case "board_updated": return <Info className="h-4 w-4 text-amber-500" />;
    case "board_deleted": return <Trash2 className="h-4 w-4 text-priority-urgent" />;
    default: return <Bell className="h-4 w-4 text-muted" />;
  }
};

const Topbar = ({ title, subtitle, actions, onCreateBoard }) => {
  const { user, logout } = useAuth();
  const { openCommand, openMobileMenu } = useLayout() || {};
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  
  const navigate = useNavigate();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  
  const ref = useRef(null);
  const notifRef = useRef(null);

  // Закрытие меню по клику снаружи
  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleNotifClick = (n) => {
    if (!n.read_at) markAsRead(n.id);
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  };

  const grouped = groupNotifications(notifications);

  const renderGroup = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-2">
        <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-faint">{title}</p>
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => handleNotifClick(n)}
            className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2 ${!n.read_at ? "bg-brand-500/5" : ""}`}
          >
            <div className="mt-0.5 shrink-0">{getIcon(n.kind)}</div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${!n.read_at ? "font-semibold text-ink" : "text-muted"}`}>{n.title}</p>
              <p className="mt-0.5 text-xs text-faint leading-relaxed">{n.body}</p>
            </div>
            {!n.read_at && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
          </button>
        ))}
      </div>
    );
  };

  return (
    <header className="glass sticky top-0 z-20 flex flex-col border-b px-4 md:px-6">
      {/* Верхняя строка */}
      <div className="flex h-[72px] items-center gap-3">
        
        {/* Логотип вместо бургера на мобильных */}
        <button 
          onClick={openMobileMenu} 
          className="md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        >
          <div className="brand-gradient grid h-8 w-8 place-items-center rounded-xl shadow-[var(--shadow-brand)]">
            <Zap className="h-4 w-4 fill-white text-white" />
          </div>
        </button>

        {/* Заголовок для десктопа */}
        <div className="hidden md:block min-w-0 shrink">
          {title && <h1 className="truncate font-display text-lg font-bold leading-tight tracking-tight text-ink">{title}</h1>}
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>

        <div className="ml-auto flex items-center gap-2">
          
          {/* Поиск в виде иконки (показываем до 2xl) */}
          <button 
            onClick={openCommand} 
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-[var(--shadow-card)] transition-all duration-200 hover:border-brand-300 hover:text-brand-500 2xl:hidden"
            title="Поиск"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Поиск с текстом (показываем только на 2xl и выше) */}
          <button 
            onClick={openCommand} 
            className="hidden h-10 w-56 items-center gap-2.5 rounded-full border border-line bg-surface px-4 text-sm text-faint shadow-[var(--shadow-card)] transition-all duration-200 hover:border-brand-300 hover:text-muted hover:shadow-[var(--shadow-soft)] 2xl:flex lg:w-64">
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Поиск</span>
            <kbd className="flex items-center gap-0.5 rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted">
              Ctrl + K
            </kbd>
          </button>

          {actions}

          {/* Уведомления */}
          <div className="relative shrink-0" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-px hover:text-ink hover:shadow-[var(--shadow-soft)]"
              title="Уведомления"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-priority-urgent px-1 text-[10px] font-bold text-white shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                {/* Невидимый фон для закрытия по клику мимо (без затемнения) */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setNotifOpen(false)} 
                />
                
                {/* Само окно */}
                <div className="fixed left-4 right-4 top-[72px] z-50 flex max-h-[calc(100vh-140px)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-lift)] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96"> 
                  <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
                    <h3 className="font-semibold text-ink">Уведомления</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
                      >
                        <CheckCheck className="h-3.5 w-3.5" /> Прочитать все
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-sm text-faint">
                        Нет уведомлений
                      </div>
                    ) : (
                      <>
                        {renderGroup("Сегодня", grouped.today)}
                        {renderGroup("Вчера", grouped.yesterday)}
                        {renderGroup("Ранее", grouped.older)}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Кнопка с текстом (только для десктопа, скрыта на мобильных) */}
          <div className="hidden xl:block shrink-0">
            <Button size="md" onClick={onCreateBoard}>
              <Plus className="h-4 w-4" /> Новая доска
            </Button>
          </div>
          
          {/* Кнопка только с плюсом (для мобильных и планшетов) */}
          <button 
            onClick={onCreateBoard}
            className="brand-gradient flex xl:hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-[var(--shadow-brand)]"
          >
            <Plus className="h-5 w-5" />
          </button>

          {/* Профиль */}
          <div className="relative shrink-0" ref={ref}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-1 pr-2 shadow-[var(--shadow-card)] transition-all duration-200 hover:border-brand-300 hover:shadow-[var(--shadow-soft)]"
            >
              <Avatar name={user?.name} id={user?.id} src={user?.avatar_url} size="sm" />
              <span className="hidden max-w-[7rem] truncate text-sm font-medium text-ink xl:block">
                {user?.name?.split(" ")[0]}
              </span>
              <ChevronDown className="h-4 w-4 text-faint" />
            </button>

            {menuOpen && (
              <div className="card animate-in absolute right-0 mt-2 w-56 rounded-2xl p-1.5 shadow-[var(--shadow-lift)]">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                  <p className="truncate text-xs text-faint">{user?.email}</p>
                </div>
                <div className="my-1 border-t" />
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-priority-urgent transition-colors hover:bg-surface-2"
                >
                  <LogOut className="h-4 w-4" /> Выйти
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Вторая строка для мобильных: Название и описание */}
      <div className="md:hidden pb-3 pl-1">
        {title && <h1 className="truncate font-display text-lg font-bold leading-tight tracking-tight text-ink">{title}</h1>}
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
    </header>
  );
};

export default Topbar;