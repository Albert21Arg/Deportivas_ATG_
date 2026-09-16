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
        className="w-full max-w-md rounded-2xl border border-red-300 bg-white p-6 shadow-2xl shadow-black/10 dark:border-red-500/20 dark:bg-slate-900 dark:shadow-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-xl font-black text-amber-700 dark:text-amber-300">
          !
        </div>

        <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white" id="confirm-action-title">
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{message}</p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800 dark:hover:text-white"
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
