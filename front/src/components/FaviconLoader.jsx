import { useEffect } from 'react';

import api from '../services/api.js';

/*
|--------------------------------------------------------------------------
| Favicon dinámico
|--------------------------------------------------------------------------
| Lee la URL configurada por el superadmin (ver /dashboard/site-settings) y
| la aplica como ícono de la pestaña. Si no hay ninguna configurada, deja el
| favicon por defecto del navegador tal cual.
*/

export default function FaviconLoader() {
  useEffect(() => {
    let active = true;

    api.get('/public/site-settings')
      .then(({ data }) => {
        if (!active) return;
        const faviconUrl = data.data.settings?.faviconUrl;
        if (!faviconUrl) return;

        let link = document.querySelector('link[rel="icon"]');
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = faviconUrl;
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  return null;
}
