import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { UserPlus, MoreVertical, Shield, ShieldOff, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import { createPortal } from "react-dom";
import Avatar from "../ui/Avatar";
import { boardApi } from "../../lib/api";
import UserSearchCombobox from "../ui/UserSearchCombobox";

const roleLabel = (role) =>
  role === "owner" ? "Владелец" : role === "admin" ? "Админ" : "Участник";

  const MemberRow = ({ m, canManage, ownerId, currentUserRole, onRoleChange, onRemove }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  // Закрытие по клику снаружи
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  // Вычисляем координаты кнопки при открытии меню
  const handleOpen = (e) => {
    e.stopPropagation();
    if (!menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4, // 4px отступ
        left: rect.right + window.scrollX - 208, // 208px - ширина меню (w-52 = 208px)
      });
    }
    setMenuOpen((o) => !o);
  };

  const isOwner = m.role === "owner" || m.id === ownerId;
  const canEditThis =
    canManage &&
    !isOwner &&
    !(currentUserRole === "admin" && m.role === "admin");

  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
      <Avatar name={m.name} id={m.id} src={m.avatar_url} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{m.name}</p>
        <p className="truncate text-xs text-faint">{m.email}</p>
      </div>
      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">
        {roleLabel(m.role)}
      </span>

      {canEditThis && (
        <div className="relative" ref={ref}>
          <button
            ref={buttonRef}
            onClick={handleOpen}
            className="rounded-full p-1.5 text-faint transition-colors hover:bg-elevated hover:text-ink"
            title="Действия"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && createPortal(
            <>
              {/* Невидимый фон для закрытия меню по клику мимо (опционально) */}
              <div className="fixed inset-0 z-[100]" onClick={() => setMenuOpen(false)} />
              
              {/* Само меню, позиционированное по координатам кнопки */}
              <div 
                className="fixed z-[110] w-52 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow-lift)] animate-in zoom-in-95"
                style={{ top: coords.top, left: coords.left }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {m.role !== "admin" ? (
                  <button
                    onClick={() => { onRoleChange(m.id, "admin"); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-2"
                  >
                    <Shield className="h-4 w-4" /> Сделать администратором
                  </button>
                ) : (
                  <button
                    onClick={() => { onRoleChange(m.id, "member"); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-2"
                  >
                    <ShieldOff className="h-4 w-4" /> Сделать участником
                  </button>
                )}
                <button
                  onClick={() => { onRemove(m.id); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-priority-urgent transition-colors hover:bg-surface-2"
                >
                  <Trash2 className="h-4 w-4" /> Удалить с доски
                </button>
              </div>
            </>,
            document.body
          )}
        </div>
      )}
    </li>
  );
};

const MembersModal = ({ open, onClose, boardId, members, setMembers, canManage, ownerId, currentUserRole }) => {
  const [loading, setLoading] = useState(false);

  

  const changeRole = async (userId, role) => {
    // оптимистично обновляем UI
    setMembers((prev) =>
      prev.map((m) => (m.id === userId ? { ...m, role } : m))
    );
    try {
      const updated = await boardApi.updateMemberRole(boardId, userId, role);
      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, ...updated } : m))
      );
      toast.success(
        role === "admin"
          ? `${updated.name} теперь администратор`
          : `${updated.name} теперь участник`
      );
    } catch (err) {
      // откат
      setMembers((prev) =>
        prev.map((m) =>
          m.id === userId
            ? { ...m, role: role === "admin" ? "member" : "admin" }
            : m
        )
      );
      toast.error(err.message);
    }
  };

  const remove = async (userId) => {
    const prevMembers = members;
    setMembers((prev) => prev.filter((m) => m.id !== userId));
    try {
      await boardApi.removeMember(boardId, userId);
      toast.success("Участник удалён с доски");
    } catch (err) {
      setMembers(prevMembers);
      toast.error(err.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Участники"
      description="Пригласите коллег для совместной работы."
    >
      {canManage && (
        <div className="mb-5">
          <UserSearchCombobox 
            onSelect={async (user) => {
              setLoading(true);
              try {
                const member = await boardApi.addMember(boardId, { email: user.email });
                setMembers((prev) => {
                  const exists = prev.find((m) => m.id === member.id);
                  return exists
                    ? prev.map((m) => (m.id === member.id ? { ...m, ...member } : m))
                    : [...prev, member];
                });
                toast.success(`${member.name} добавлен(а)`);
              } catch (err) {
                toast.error(err.message);
              } finally {
                setLoading(false);
              }
            }} 
          />
        </div>
      )}
      <ul className="space-y-1">
        {members.map((m) => (
          <MemberRow
            key={m.id}
            m={m}
            canManage={canManage}
            ownerId={ownerId}
            currentUserRole={currentUserRole}
            onRoleChange={changeRole}
            onRemove={remove}
          />
        ))}
      </ul>
    </Modal>
  );
};

export default MembersModal;