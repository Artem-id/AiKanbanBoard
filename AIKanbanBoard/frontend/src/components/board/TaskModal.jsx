import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Trash2, GitBranch, Loader2, Check } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Input, Textarea, Select } from "../ui/Input";
import { PRIORITIES } from "../../lib/utils";

const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const empty = (columnId) => ({
  title: "",
  description: "",
  priority: "medium",
  due_date: "",
  assignee_id: "",
  column_id: columnId || "",
});

const TaskModal = ({ open, onClose, task, defaultColumnId, columns, members, actions, onBreakdown }) => {
  const isEdit = Boolean(task);
  const [form, setForm] = useState(empty(defaultColumnId));
  const [saving, setSaving] = useState(false);
  const [breakingDown, setBreakingDown] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        due_date: toDateInput(task.due_date),
        assignee_id: task.assignee_id || "",
        column_id: task.column_id,
      });
    } else {
      setForm(empty(defaultColumnId || columns[0]?.id));
    }
  }, [open, task, defaultColumnId, columns]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Название обязательно");
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      due_date: form.due_date || null,
      assignee_id: form.assignee_id || null,
    };
    try {
      if (isEdit) {
        await actions.updateTask(task.id, payload);
        toast.success("Задача обновлена");
      } else {
        await actions.createTask({ ...payload, column_id: form.column_id });
        toast.success("Задача создана");
      }
      onClose();
    } catch {
      /* handled in hook */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await actions.deleteTask(task.id);
    onClose();
  };

  const handleBreakdown = async () => {
    setBreakingDown(true);
    try {
      await onBreakdown(task);
    } finally {
      setBreakingDown(false);
    }
  };

  // Выносим кнопки в футер модалки
  const footer = (
    <div className="flex w-full items-center justify-between gap-2">
      <div>
        {isEdit && (
          <Button type="button" variant="ghost" onClick={handleDelete} className="text-priority-urgent px-2">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        {isEdit && (
          <Button type="button" variant="outline" onClick={handleBreakdown} disabled={breakingDown} className="px-2 sm:px-4">
            {breakingDown ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
            <span className="hidden sm:inline ml-1">Разбить с ИИ</span>
          </Button>
        )}
        <Button type="submit" form="task-form" loading={saving} className="px-3 sm:px-4">
          {isEdit ? (
            <>
              <Check className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Сохранить</span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Создать задачу</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title={isEdit ? "Редактировать задачу" : "Новая задача"} 
      size="md"
      footer={footer}
    >
      <form id="task-form" onSubmit={onSubmit} className="space-y-4 pb-2">
        <Input label="Название" placeholder="Что нужно сделать?" autoFocus value={form.title} onChange={set("title")} />
        <Textarea label="Описание" rows={4} placeholder="Добавьте детали..." value={form.description} onChange={set("description")} />

        <div className="grid grid-cols-2 gap-4">
          <Select label="Приоритет" value={form.priority} onChange={set("priority")}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </Select>
          <Input label="Дедлайн" type="date" value={form.due_date} onChange={set("due_date")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select label="Исполнитель" value={form.assignee_id} onChange={set("assignee_id")}>
            <option value="">Не назначен</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
          {!isEdit && (
            <Select label="Колонка" value={form.column_id} onChange={set("column_id")}>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </Select>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default TaskModal;