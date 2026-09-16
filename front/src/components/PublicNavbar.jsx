import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function PublicNavbar({ showLogin = true }) {
  const { isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-4 md:px-6">

        {/* =========================
            LOGO
        ========================== */}
        <Link
          to={isAuthenticated ? '/dashboard' : '/'}
          className="group relative flex items-center"
        >
          <div className="relative flex items-center">

            {/* Firma */}
            <span
              className="
                absolute
                -top-[10px]
                left-[7px]
                z-10
                whitespace-nowrap
                text-[9px]
                italic
                font-medium
                tracking-tight
                text-slate-900
                dark:text-cyan-400
                transition-all
                duration-300
                sm:-top-[12px]
                sm:left-[9px]
                sm:text-[10px]
                md:-top-[15px]
                md:left-[12px]
                md:text-[12px]
                group-hover:text-slate-700
                dark:group-hover:text-cyan-300
              "
              style={{
                fontFamily: '"Brush Script MT", "Segoe Script", cursive',
              }}
            >
              Albert Taborda

              {/* Trazo de la firma */}
              <span
                className="
                  absolute
                  -bottom-[2px]
                  left-0
                  h-[1px]
                  w-[105%]
                  -rotate-[3deg]
                  rounded-full
                  bg-slate-900
                  dark:bg-cyan-400
                "
              />
            </span>

            {/* Nombre principal */}
            <span
              className="
                whitespace-nowrap
                text-[18px]
                font-extrabold
                tracking-[-1px]
                text-slate-900
                dark:text-white
                sm:text-[21px]
                sm:tracking-[-1.2px]
                md:text-[25px]
                md:tracking-[-1.5px]
              "
            >
              Deportiva
            </span>

            {/* Balón */}
            <span
              className="
                ml-1
                shrink-0
                text-[14px]
                leading-none
                drop-shadow-[0_0_5px_rgba(34,211,238,0.7)]
                sm:text-[16px]
                md:text-[18px]
              "
            >
              ⚽
            </span>

            {/* Separador */}
            <span
              className="
                mx-1.5
                h-5
                w-[1px]
                shrink-0
                rounded-full
                bg-gradient-to-b
                from-emerald-400
                to-cyan-400
                sm:mx-2
                sm:h-6
                md:h-7
                md:w-[2px]
              "
            />

            {/* ATG */}
            <div className="flex items-center gap-[1px]">

              {/* A */}
              <span
                className="
                  relative
                  text-[23px]
                  font-black
                  italic
                  leading-none
                  tracking-[-3px]
                  text-transparent
                  bg-gradient-to-b
                  from-emerald-300
                  via-emerald-400
                  to-teal-500
                  bg-clip-text
                  sm:text-[27px]
                  sm:tracking-[-3px]
                  md:text-[32px]
                  md:tracking-[-4px]
                "
              >
                A

                <span
                  className="
                    absolute
                    bottom-[3px]
                    left-[3px]
                    h-[1.5px]
                    w-[14px]
                    rounded-full
                    bg-emerald-300
                    sm:bottom-[4px]
                    sm:left-[4px]
                    sm:w-[17px]
                    md:bottom-[5px]
                    md:left-[5px]
                    md:h-[2px]
                    md:w-[20px]
                  "
                />

                <span
                  className="
                    absolute
                    bottom-[1px]
                    left-[8px]
                    h-[4px]
                    w-[4px]
                    rounded-full
                    border
                    border-emerald-300
                    sm:left-[10px]
                    sm:h-[5px]
                    sm:w-[5px]
                    md:bottom-[2px]
                    md:left-[13px]
                    md:h-[6px]
                    md:w-[6px]
                  "
                />
              </span>

              {/* T */}
              <span
                className="
                  text-[23px]
                  font-black
                  leading-none
                  tracking-[-2px]
                  text-slate-900
                  dark:text-white
                  sm:text-[27px]
                  sm:tracking-[-2.5px]
                  md:text-[32px]
                  md:tracking-[-3px]
                "
              >
                T
              </span>

              {/* G */}
              <span
                className="
                  relative
                  text-[23px]
                  font-black
                  leading-none
                  tracking-[-3px]
                  text-transparent
                  bg-gradient-to-br
                  from-cyan-300
                  via-cyan-400
                  to-blue-500
                  bg-clip-text
                  sm:text-[27px]
                  sm:tracking-[-3px]
                  md:text-[32px]
                  md:tracking-[-4px]
                "
              >
                G

                <span
                  className="
                    absolute
                    bottom-[3px]
                    left-[2px]
                    h-[1.5px]
                    w-[17px]
                    -rotate-[18deg]
                    rounded-full
                    bg-cyan-400
                    sm:bottom-[4px]
                    sm:w-[21px]
                    md:bottom-[5px]
                    md:left-[3px]
                    md:h-[2px]
                    md:w-[25px]
                  "
                />
              </span>

            </div>
          </div>
        </Link>

        {/* =========================
            ACCIONES
        ========================== */}
        <div className="flex shrink-0 items-center">
          <button
            onClick={toggleTheme}
            type="button"
            aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-xs text-slate-600 transition hover:border-emerald-400 hover:text-emerald-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-400 dark:hover:text-emerald-400 sm:h-9 sm:w-9"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {showLogin && (
            isAuthenticated ? (
              <button
                onClick={handleLogout}
                type="button"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className="
                  ml-2
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-slate-300
                  font-medium
                  text-slate-600
                  transition-all
                  duration-300
                  dark:border-slate-700
                  dark:text-slate-300
                  sm:h-auto
                  sm:w-auto
                  sm:px-3
                  sm:py-2
                  sm:text-xs
                  md:px-4
                  md:text-sm
                  hover:border-red-400
                  hover:bg-red-400/5
                  hover:text-red-500
                  dark:hover:text-red-400
                "
              >
                <span className="sm:hidden">
                  <LogOut size={16} strokeWidth={2} aria-hidden="true" />
                </span>

                <span className="hidden sm:inline">
                  Cerrar sesión
                </span>
              </button>
            ) : (
              <Link
                to="/login"
                className="
                  ml-2
                  shrink-0
                  rounded-lg
                  border
                  border-emerald-500/50
                  px-2.5
                  py-1.5
                  text-[11px]
                  font-semibold
                  text-emerald-600
                  transition-all
                  duration-300
                  dark:border-emerald-400/50
                  dark:text-emerald-300
                  sm:px-3
                  sm:py-2
                  sm:text-xs
                  md:px-4
                  md:text-sm
                  hover:border-emerald-400
                  hover:bg-emerald-400
                  hover:text-slate-950
                  hover:shadow-[0_0_20px_rgba(52,211,153,0.2)]
                "
              >
                <span className="sm:hidden">
                  Entrar
                </span>

                <span className="hidden sm:inline">
                  Iniciar sesión
                </span>
              </Link>
            )
          )}
        </div>

      </div>
    </nav>
  );
}