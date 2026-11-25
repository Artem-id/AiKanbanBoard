import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Command, Zap, FolderKanban, CheckSquare, Users, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLayout } from "../components/layout/AppLayout";
import { useWorkspace } from "../hooks/useWorkspace";
import Topbar from "../components/layout/Topbar";
import Button from "../components/ui/Button";
import Avatar from "../components/ui/Avatar";
import { cn } from "../lib/utils";
import { authApi } from "../lib/api";
import Modal from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import toast from "react-hot-toast";

const Switch = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
      checked ? "bg-brand-500" : "bg-elevated"
    )}
  >
    <span
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[var(--shadow-card)] ring-0 transition-transform duration-200",
        checked ? "translate-x-[22px]" : "translate-x-0.5"
      )}
    />
  </button>
);

const Card = ({ title, description, children }) => (
  <section className="rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
    <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
    {description && <p className="mt-1 text-xs text-muted">{description}</p>}
    <div className="mt-5">{children}</div>
  </section>
);

const Settings = () => {
  const { user, logout } = useAuth();
  const { openCreateBoard } = useLayout();
  const { boards, tasks, members } = useWorkspace();
  const navigate = useNavigate();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [reduceMotion, setReduceMotion] = useState(
    () => localStorage.getItem("pref-reduced-motion") === "true"
  );

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = reduceMotion ? "true" : "false";
    localStorage.setItem("pref-reduced-motion", String(reduceMotion));
  }, [reduceMotion]);


    const handleDeleteAccount = async () => {
    if (confirmText !== "ПОДТВЕРДИТЬ УДАЛЕНИЕ") {
      toast.error("Введите фразу для подтверждения");
      return;
    }
    setIsDeleting(true);
    try {
      await authApi.deleteAccount();
      toast.success("Аккаунт удален");
      logout();
      navigate("/login");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Topbar title="Настройки" subtitle="Профиль и предпочтения" onCreateBoard={openCreateBoard} />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-6 py-8 md:px-8">
          {/* Profile */}
          <Card title="Профиль" description="Как вы отражаетесь в рабочем пространстве.">
            <div className="flex items-center gap-4">
              <Avatar name={user?.name} id={user?.id} src={user?.avatar_url} size="lg" className="h-16 w-16 text-lg" />
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold tracking-tight">{user?.name}</p>
                <p className="truncate text-sm text-muted">{user?.email}</p>
              </div>
            </div>
          </Card>

          {/* Workspace */}
          <Card title="Рабочее пространство" description="Обзор вашей активности.">
            <div className="grid grid-cols-3 gap-3">
              <Metric icon={FolderKanban} label="Доски" value={boards.length} tint="#2f8159" />
              <Metric icon={CheckSquare} label="Задачи" value={tasks.length} tint="#0ea5e9" />
              <Metric icon={Users} label="Люди" value={members.length} tint="#10b981" />
            </div>
          </Card>

          {/* Preferences */}
          <Card title="Предпочтения" description="Сохраняются в этом браузере.">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Уменьшить анимацию</p>
                <p className="mt-0.5 text-xs text-muted">Минимизировать анимации и переходы в приложении.</p>
              </div>
              <Switch checked={reduceMotion} onChange={setReduceMotion} />
            </div>
            <div className="mt-5 flex items-center justify-between gap-4 border-t pt-5">
              <div>
                <p className="text-sm font-medium text-ink">Меню команд</p>
                <p className="mt-0.5 text-xs text-muted">Переходите куда угодно, ищите доски, создавайте задачи.</p>
              </div>
              <kbd className="flex items-center gap-0.5 rounded-md bg-surface-2 px-2 py-1 text-[11px] font-semibold text-muted">
                Ctrl + K
              </kbd>
            </div>
          </Card>

          {/* About */}
          <Card title="О приложении">
            <div className="flex items-center gap-3">
              <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-2xl shadow-[var(--shadow-brand)]">
                <Zap className="h-5 w-5 fill-white text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Flowboard</p>
                <p className="text-xs text-muted">Канбан доска с ИИ</p>
              </div>
            </div>
          </Card>

          {/* Account */}
          <Card title="Аккаунт" description="Управление вашей сессией.">
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" onClick={() => { logout(); navigate("/login"); }}>
                <LogOut className="h-4 w-4" /> Выйти
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setDeleteOpen(true)} 
                className="text-priority-urgent border-priority-urgent/30 hover:bg-priority-urgent/10"
              >
                <Trash2 className="h-4 w-4" /> Удалить аккаунт
              </Button>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Модальное окно удаления аккаунта */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Удалить аккаунт?"
        description="Это действие нельзя отменить. Все ваши доски, задачи и данные будут безвозвратно удалены."
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Чтобы подтвердить удаление, введите фразу <strong>ПОДТВЕРДИТЬ УДАЛЕНИЕ</strong>:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="ПОДТВЕРДИТЬ УДАЛЕНИЕ"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Отмена
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteAccount} 
              loading={isDeleting} 
              disabled={confirmText !== "ПОДТВЕРДИТЬ УДАЛЕНИЕ"}
            >
              Удалить аккаунт
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

const Metric = ({ icon: Icon, label, value, tint }) => (
  <div className="rounded-2xl bg-surface-2/60 p-4">
    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${tint}1a`, color: tint }}>
      <Icon className="h-4 w-4" />
    </div>
    <p className="font-display text-2xl font-semibold tracking-tight tabular text-ink">{value}</p>
    <p className="mt-0.5 text-xs text-muted">{label}</p>
  </div>
);

export default Settings;
