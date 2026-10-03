import { useEffect, useState } from 'react';

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createParticles(type) {
  const count = type === 'scorer' ? 30 : type === 'favorite-player' ? 27 : 24;
  return Array.from({ length: count }, (_, index) => {
    const isFootball = type === 'scorer'
      || (type === 'favorite-player' && index < 7);

    return {
      id: index,
      symbol: isFootball ? '⚽' : '❤️',
      left: randomBetween(8, 92),
      top: randomBetween(12, 88),
      size: randomBetween(14, 28),
      delay: randomBetween(0, 180),
      x: randomBetween(-180, 180),
      y: randomBetween(-230, 230),
      rotation: randomBetween(-100, 100),
    };
  });
}

export default function CardOpeningCelebration({ type, onComplete }) {
  const [particles] = useState(() => createParticles(type));

  useEffect(() => {
    const timeout = window.setTimeout(onComplete, 950);
    return () => window.clearTimeout(timeout);
  }, [onComplete]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[2147483646] overflow-hidden" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/20 blur-3xl animate-pulse" />
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="card-opening-particle absolute left-1/2 top-1/2 select-none"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            fontSize: `${particle.size}px`,
            animationDelay: `${particle.delay}ms`,
            '--particle-x': `${particle.x}px`,
            '--particle-y': `${particle.y}px`,
            '--particle-rotation': `${particle.rotation}deg`,
          }}
        >
          {particle.symbol}
        </span>
      ))}
      <style>{`
        @keyframes cardOpeningBurst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.2) rotate(0deg);
          }
          18% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translate(
              calc(-50% + var(--particle-x)),
              calc(-50% + var(--particle-y))
            ) scale(0.65) rotate(var(--particle-rotation));
          }
        }
        .card-opening-particle {
          animation: cardOpeningBurst 850ms cubic-bezier(0.15, 0.75, 0.25, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .card-opening-particle {
            animation-duration: 150ms;
            animation-delay: 0ms !important;
          }
        }
      `}</style>
    </div>
  );
}
