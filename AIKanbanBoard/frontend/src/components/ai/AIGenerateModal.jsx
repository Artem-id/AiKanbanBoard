import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Sparkles, Loader2, Check, RefreshCw } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Input, Select } from "../ui/Input";
import { PriorityBadge } from "../ui/Badge";
import { aiApi } from "../../lib/api";

const AIGenerateModal = ({ open, onClose, boardId, columns, defaultColumnId, onCreated }) => {
  const [goal, setGoal] = useState("");
  const [count, setCount] = useState(6);
  const [columnId, setColumnId] = useState(defaultColumnId || columns[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  useEffect(() => {
    if (open) {
      setGoal("");
      setSuggestions(null);
      setColumnId(defaultColumnId || columns[0]?.id || "");
    }
  }, [open, defaultColumnId, columns]);

  const generate = async (e) => {
    e?.preventDefault();
    if (!goal.trim()) return;
    setLoading(true);
    setSuggestions(null);
    try {
      const res = await aiApi.generateTasks(boardId, { goal: goal.trim(), count: Number(count) });
      setSuggestions(res.tasks);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addAll = async () => {
    setLoading(true);
    try {
      const res = await aiApi.generateTasks(boardId, {
        goal: goal.trim(),
        count: Number(count),
        column_id: columnId,
      });
      onCreated?.(res.tasks);
      toast.success(`Добавлено ${res.tasks.length} задач`);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Определяем футер в зависимости от состояния
  const footer = !suggestions ? (
    <Button type="submit" form="ai-generate-form" className="w-full" loading={loading}>
      <Sparkles className="h-4 w-4" /> Сгенерировать задачи
    </Button>
  ) : (
    <div className="flex w-full items-center justify-between gap-2">
      <Button variant="ghost" onClick={generate} disabled={loading} className="px-2 sm:px-4">
        <RefreshCw className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">Заново</span>
      </Button>
      <Button onClick={addAll} loading={loading} className="px-3 sm:px-4">
        <Check className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">
          Добавить всё в {columns.find((c) => c.id === columnId)?.title}
        </span>
      </Button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-500" /> Генератор задач ИИ
        </span>
      }
      description="Опишите цель, и ИИ создаст черновик бэклога."
      footer={footer}
    >
      <form id="ai-generate-form" onSubmit={generate} className="space-y-4 pb-2">
        <Input
          label="Цель проекта"
          placeholder="Например: Создать интернет-магазин одежды"
          autoFocus
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Количество задач" value={count} onChange={(e) => setCount(e.target.value)}>
            {[4, 6, 8, 10].map((n) => (
              <option key={n} value={n}>{n} задач</option>
            ))}
          </Select>
          <Select label="Добавить в колонку" value={columnId} onChange={(e) => setColumnId(e.target.value)}>
            {columns.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </Select>
        </div>
      </form>

      {loading && !suggestions && (
        <div className="mt-5 flex items-center justify-center gap-2 py-8 text-muted">
          <Loader2 className="h-5 w-5 animate-spin text-brand-500" /> Генерирую…
        </div>
      )}

      {suggestions && (
        <div className="mt-5 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint tabular">{suggestions.length} предложенных задач</p>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {suggestions.map((t, i) => (
              <div key={i} className="card rounded-2xl p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{t.title}</p>
                  <PriorityBadge priority={t.priority} />
                </div>
                {t.description && <p className="mt-1 text-xs text-muted">{t.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AIGenerateModal;