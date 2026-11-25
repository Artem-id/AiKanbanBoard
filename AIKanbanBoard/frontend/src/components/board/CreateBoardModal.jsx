import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Input, Textarea } from "../ui/Input";
import { useBoards } from "../../context/BoardsContext";
import { cn } from "../../lib/utils";

// Earthy palette that complements the forest-green theme.
const COLORS = [
  "#2f8159", // forest (brand default)
  "#2c9c8f", // teal
  "#6f9b54", // olive / sage
  "#d4a23c", // amber
  "#c26a45", // terracotta
  "#5f7da6", // slate blue
];

const CreateBoardModal = ({ open, onClose }) => {
  const { create } = useBoards();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", color: COLORS[0] });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      const board = await create(form);
      toast.success("Доска создана");
      onClose();
      setForm({ title: "", description: "", color: COLORS[0] });
      navigate(`/board/${board.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Выносим кнопки в отдельную переменную, чтобы передать их в футер модалки
  const footer = (
    <>
      <Button type="button" variant="ghost" onClick={onClose}>
        Отмена
      </Button>
      <Button type="submit" form="create-board-form" loading={loading}>
        Создать доску
      </Button>
    </>
  );

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="Создать доску" 
      description="Доска начинается с колонок: Сделать, В работе, На проверке, Готово."
      footer={footer} // <--- Передаем кнопки в футер модалки
    >
      {/* Добавляем id к форме, чтобы кнопка в футере могла ее сабмитить */}
      <form id="create-board-form" onSubmit={onSubmit} className="space-y-4 pb-2">
        <Input
          label="Название доски"
          placeholder="Например: Дорожная карта продукта"
          autoFocus
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Textarea
          label="Описание (необязательно)"
          rows={3}
          placeholder="О чём эта доска?"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-muted">Акцентный цвет</label>
          {/* Добавил flex-wrap и gap-3, чтобы кнопки цветов не прилипали и переносились при необходимости */}
          <div className="flex flex-wrap gap-3 pt-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className={cn(
                  "h-7 w-7 rounded-full transition-transform",
                  form.color === c ? "ring-2 ring-ink/70 ring-offset-2 ring-offset-surface" : "hover:scale-110"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default CreateBoardModal;