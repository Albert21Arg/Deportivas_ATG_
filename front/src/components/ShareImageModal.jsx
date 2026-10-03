import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/*
|--------------------------------------------------------------------------
| Vista previa para compartir una imagen
|--------------------------------------------------------------------------
| La usan "Compartir fecha" (página pública) y "Compartir tarjeta" del
| jugador. Genera la imagen al abrirse (buildImage) y ofrece:
|  - Compartir imagen: abre el menú del celular (WhatsApp, Instagram,
|    Facebook...). Los navegadores de celular, sobre todo iPhone, solo abren
|    ese menú en respuesta directa a un toque, por eso la imagen se prepara
|    antes y el botón la comparte al instante.
|  - Descargar: guarda la imagen (en computador, para adjuntarla a mano).
|  - WhatsApp (enlace): solo texto con el enlace, por si el navegador no
|    permite compartir archivos.
*/

export default function ShareImageModal({
  title,
  subtitle,
  fileName,
  shareText,
  buildImage,
  onClose,
  zIndexClass = 'z-[70]',
}) {
  const [image, setImage] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;

    buildImage()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImage({ url: objectUrl, file: new File([blob], fileName, { type: blob.type || 'image/png' }) });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // La imagen se genera una sola vez al abrir la vista previa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canShareFile =
    Boolean(image) && typeof navigator.canShare === 'function' && navigator.canShare({ files: [image.file] });

  async function shareImage() {
    try {
      await navigator.share({ files: [image.file], title, text: shareText });
    } catch {
      // El usuario cerró el menú de compartir: no hay nada que hacer.
    }
  }

  function downloadImage() {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = fileName;
    link.click();
  }

  function shareOnWhatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  }

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex bg-slate-950/80 md:items-center md:justify-center md:p-8 md:backdrop-blur-sm`}
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <div
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white dark:bg-slate-900 md:h-auto md:max-h-[90vh] md:max-w-md md:rounded-2xl md:border md:border-slate-200 md:shadow-2xl md:dark:border-slate-700"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/[0.06]">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
            {subtitle && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            onClick={onClose}
            type="button"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-3 dark:bg-black/30">
          {error ? (
            <p className="py-10 text-center text-sm text-slate-500">No se pudo generar la imagen.</p>
          ) : image ? (
            <img className="mx-auto w-full max-w-md rounded-xl shadow-lg" src={image.url} alt={title} />
          ) : (
            <div className="flex flex-col items-center py-12 text-sm text-slate-500">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
              <p className="mt-3">Generando imagen…</p>
            </div>
          )}
        </div>

        <div className="mx-auto grid w-full max-w-md gap-2 border-t border-slate-200 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-white/[0.06]">
          {canShareFile && (
            <button
              className="min-h-11 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-black transition hover:bg-emerald-400"
              onClick={shareImage}
              type="button"
            >
              Compartir imagen
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/[0.1] dark:text-slate-200 dark:hover:bg-white/[0.04]"
              onClick={downloadImage}
              type="button"
              disabled={!image}
            >
              Descargar
            </button>
            <button
              className="min-h-11 rounded-xl border border-emerald-500/40 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/10 dark:text-emerald-300"
              onClick={shareOnWhatsapp}
              type="button"
            >
              WhatsApp (enlace)
            </button>
          </div>
          {!canShareFile && image && (
            <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
              Para Instagram o Facebook desde el computador: descarga la imagen y súbela en la red social.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
