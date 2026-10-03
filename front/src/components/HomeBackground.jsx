import { useState } from 'react';

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createAtmosphere() {
  const stars = Array.from({ length: 52 }, (_, index) => ({
    id: index,
    left: randomBetween(2, 98),
    top: randomBetween(2, 98),
    size: randomBetween(1, 2.5),
    delay: randomBetween(-5, 0),
    duration: randomBetween(2.5, 5.5),
  }));
  const balls = Array.from({ length: 3 }, (_, index) => {
    const stops = [0, 18, 42, 67, 86, 100].map((step) => ({
      step,
      x: randomBetween(6, 86),
      y: randomBetween(8, 82),
      rotation: randomBetween(-160, 360),
    }));
    const animationName = `homeBallPath${index}${Math.random().toString(36).slice(2)}`;
    const keyframes = stops
      .map(({ step, x, y, rotation }) => (
        `${step}% { transform: translate(${x}vw, ${y}vh) rotate(${rotation}deg); }`
      ))
      .join('\n');

    return {
      id: index,
      animationName,
      keyframes,
      duration: 30 + index * 7,
      delay: -index * 9,
    };
  });

  return { stars, balls };
}

export default function HomeBackground() {
  const [atmosphere] = useState(createAtmosphere);

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_18%,rgba(16,185,129,0.08),transparent_38%),radial-gradient(ellipse_at_82%_68%,rgba(6,182,212,0.07),transparent_42%)] dark:bg-[radial-gradient(ellipse_at_18%_18%,rgba(16,185,129,0.12),transparent_38%),radial-gradient(ellipse_at_82%_68%,rgba(6,182,212,0.1),transparent_42%)]" />

        {atmosphere.stars.map((star) => (
          <span
            key={star.id}
            className="home-background-motion absolute rounded-full bg-emerald-400/70 shadow-[0_0_8px_rgba(52,211,153,0.75)] dark:bg-cyan-200/70"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animation: `homeStarTwinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {atmosphere.balls.map((ball) => (
        <span
          key={ball.id}
          className="home-background-motion pointer-events-none fixed left-0 top-0 z-[2] select-none text-4xl opacity-70 drop-shadow-[0_0_18px_rgba(16,185,129,0.8)] sm:text-5xl"
          style={{
            animation: `${ball.animationName} ${ball.duration}s ease-in-out ${ball.delay}s infinite`,
          }}
          aria-hidden="true"
        >
          ⚽
        </span>
      ))}

      <style>{`
        @keyframes homeStarTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.75); }
          50% { opacity: 0.95; transform: scale(1.3); }
        }
        ${atmosphere.balls.map((ball) => `
          @keyframes ${ball.animationName} {
            ${ball.keyframes}
          }
        `).join('\n')}
        @media (prefers-reduced-motion: reduce) {
          .home-background-motion {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
