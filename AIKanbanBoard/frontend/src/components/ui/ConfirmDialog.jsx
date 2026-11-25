import Modal from "./Modal";
import Button from "./Button";

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Вы уверены?",
  description,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отменить",
  danger = false,
  loading = false,
}) => {
  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={onClose}>{cancelLabel}</Button>
      <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
        {confirmLabel}
      </Button>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm" footer={footer}>
      {/* Пустой children, так как контент только в заголовке и футере */}
      <div className="hidden" />
    </Modal>
  );
};

export default ConfirmDialog;