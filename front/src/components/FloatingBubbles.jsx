import { useEffect, useState } from 'react';
import { Beer, Globe, Link as LinkIcon, Mail, MessageCircle, MessageSquareQuote, Phone, Send } from 'lucide-react';

import api from '../services/api.js';

const icons = { MessageCircle, MessageSquareQuote, Beer, Phone, Mail, Send, Globe, Link: LinkIcon };
const colorStyles = {
  emerald: 'bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-400',
  cyan: 'bg-cyan-500 text-slate-950 shadow-cyan-500/30 hover:bg-cyan-400',
  amber: 'bg-amber-400 text-slate-950 shadow-amber-400/30 hover:bg-amber-300',
  blue: 'bg-blue-500 text-white shadow-blue-500/30 hover:bg-blue-400',
  violet: 'bg-violet-500 text-white shadow-violet-500/30 hover:bg-violet-400',
  rose: 'bg-rose-500 text-white shadow-rose-500/30 hover:bg-rose-400',
};

export default function FloatingBubbles() {
  const [bubbles, setBubbles] = useState([]);

  useEffect(() => {
    let active = true;
    api.get('/public/floating-bubbles')
      .then(({ data }) => { if (active) setBubbles(data.data.bubbles ?? []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!bubbles.length) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[60] flex flex-col items-center gap-2.5 sm:bottom-6 sm:left-6 sm:gap-3" aria-label="Acciones rápidas">
      {bubbles.map((bubble, index) => {
        const Icon = icons[bubble.icon] ?? MessageCircle;
        const externalLink = /^https?:\/\//i.test(bubble.linkUrl);
        return (
          <a key={bubble.id} href={bubble.linkUrl} aria-label={bubble.label} title={bubble.label} target={externalLink ? '_blank' : undefined} rel={externalLink ? 'noreferrer' : undefined}
            className={`group relative flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-110 active:scale-95 sm:h-13 sm:w-13 ${colorStyles[bubble.color] ?? colorStyles.emerald}`}
            style={{ animation: `floatingBubble 3s ease-in-out ${index * 0.35}s infinite` }}>
            <span className="pointer-events-none absolute inset-0 rounded-full bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            {bubble.logoUrl ? <img className="relative z-10 h-7 w-7 rounded-full object-contain sm:h-8 sm:w-8" src={bubble.logoUrl} alt="" /> : <Icon className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:rotate-[-8deg] sm:h-6 sm:w-6" strokeWidth={2.5} />}
            <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 sm:block">{bubble.label}</span>
          </a>
        );
      })}
      <style>{`@keyframes floatingBubble { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }`}</style>
    </div>
  );
}
