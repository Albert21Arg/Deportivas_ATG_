import { useEffect } from 'react';

/*
|--------------------------------------------------------------------------
| Bloqueo de scroll del fondo cuando hay una modal abierta
|--------------------------------------------------------------------------
| Todas las modales de la app comparten el mismo patrón visual: un overlay
| "fixed inset-0" con z-index y fondo oscuro/blur, distinto de los divs
| decorativos "fixed inset-0 pointer-events-none" usados como fondo de
| página. En vez de repetir un hook de bloqueo de scroll en cada una de las
| ~20 modales (repartidas en muchas páginas y componentes), este componente
| vigila el DOM una sola vez desde la raíz: si detecta algún overlay real
| montado, bloquea el scroll del body; si no hay ninguno, lo libera. Así
| cualquier modal nueva queda cubierta automáticamente sin tocarla.
*/

function hasOpenModalOverlay() {
  const overlays = document.querySelectorAll('.fixed.inset-0');
  for (const overlay of overlays) {
    if (!overlay.classList.contains('pointer-events-none')) return true;
  }
  return false;
}

export default function ModalScrollLock() {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    function sync() {
      document.body.style.overflow = hasOpenModalOverlay() ? 'hidden' : '';
    }

    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  return null;
}
