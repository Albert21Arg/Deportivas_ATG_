export default function ConfirmActionModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={() => !isLoading && onCancel()}
    >
      <section
        className="w-full max-w-md rounded-2xl border border-red-500/20 bg-slate-900 p-6 shadow-2xl shadow-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-xl font-black text-amber-300">
          !
        </div>

        <h2 className="mt-4 text-xl font-bold text-white" id="confirm-action-title">
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-400">{message}</p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white disabled:opacity-50"
            type="button"
            disabled={isLoading}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>

          <button
            className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-wait disabled:opacity-60"
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
          >
            {isLoading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
