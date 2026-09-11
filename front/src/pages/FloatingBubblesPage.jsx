import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import DashboardNavbar from '../components/DashboardNavbar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';
import api from '../services/api.js';
import { getApiErrorDetails } from '../utils/api-error.js';

const iconOptions = ['MessageCircle', 'MessageSquareQuote', 'Beer', 'Phone', 'Mail', 'Send', 'Globe', 'Link'];
const colors = ['emerald', 'cyan', 'amber', 'blue', 'violet', 'rose'];

export default function FloatingBubblesPage() {
  const { user } = useAuth();
  const { notify } = useNotifications();
  const [bubbles, setBubbles] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const loadBubbles = useCallback(async () => {
    try {
      const { data } = await api.get('/floating-bubbles');
      const items = data.data.bubbles;
      setBubbles(items);
      setDrafts(Object.fromEntries(items.map((item) => [item.id, {
        label: item.label, linkUrl: item.linkUrl, icon: item.icon,
        logoUrl: item.logoUrl ?? '', color: item.color, status: item.status,
      }])));
    } catch (error) { notify(getApiErrorDetails(error)); }
  }, [notify]);

  useEffect(() => { loadBubbles(); }, [loadBubbles]);
  if (user?.role !== 'SUPERADMIN') return <Navigate to="/dashboard" replace />;

  function updateDraft(id, field, value) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  }

  async function saveBubble(id) {
    setSavingId(id);
    try {
      await api.patch(`/floating-bubbles/${id}`, drafts[id]);
      notify({ type: 'success', title: 'Botón actualizado', message: 'Los cambios ya se muestran en toda la plataforma.' });
      loadBubbles();
    } catch (error) { notify(getApiErrorDetails(error)); }
    finally { setSavingId(null); }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-3 pb-16 pt-20 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:pt-24">
      <DashboardNavbar />
      <section className="mx-auto max-w-5xl">
        <Link className="inline-flex text-sm font-medium text-emerald-400 transition hover:text-emerald-300" to="/dashboard">← Volver al dashboard</Link>
        <header className="mt-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">Administración</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Botones flotantes</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Configura el nombre, enlace, icono o logo y estado de los accesos rápidos visibles en toda la plataforma.</p></header>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {bubbles.map((bubble) => {
            const draft = drafts[bubble.id];
            if (!draft) return null;
            return <article key={bubble.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10">
              <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">{bubble.label}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${draft.status === 'ACTIVE' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{draft.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</span></div>
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-slate-200">Nombre<input className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-normal outline-none focus:border-emerald-400" value={draft.label} onChange={(event) => updateDraft(bubble.id, 'label', event.target.value)} /></label>
                <label className="block text-sm font-semibold text-slate-200">Enlace<input className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-normal outline-none focus:border-emerald-400" placeholder="https://..., tel:... o mailto:..." value={draft.linkUrl} onChange={(event) => updateDraft(bubble.id, 'linkUrl', event.target.value)} /></label>
                <label className="block text-sm font-semibold text-slate-200">URL del logo <span className="font-normal text-slate-500">(opcional)</span><input className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-normal outline-none focus:border-emerald-400" type="url" placeholder="https://.../logo.png" value={draft.logoUrl} onChange={(event) => updateDraft(bubble.id, 'logoUrl', event.target.value)} /></label>
                <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-semibold text-slate-200">Icono<select className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-normal outline-none focus:border-emerald-400" value={draft.icon} onChange={(event) => updateDraft(bubble.id, 'icon', event.target.value)}>{iconOptions.map((icon) => <option key={icon}>{icon}</option>)}</select></label><label className="block text-sm font-semibold text-slate-200">Color<select className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-normal outline-none focus:border-emerald-400" value={draft.color} onChange={(event) => updateDraft(bubble.id, 'color', event.target.value)}>{colors.map((color) => <option key={color}>{color}</option>)}</select></label></div>
                <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-sm font-semibold text-slate-200">Mostrar botón<input type="checkbox" checked={draft.status === 'ACTIVE'} onChange={(event) => updateDraft(bubble.id, 'status', event.target.checked ? 'ACTIVE' : 'INACTIVE')} /></label>
                <button className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60" type="button" disabled={savingId === bubble.id} onClick={() => saveBubble(bubble.id)}>{savingId === bubble.id ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </article>;
          })}
        </div>
      </section>
    </main>
  );
}
