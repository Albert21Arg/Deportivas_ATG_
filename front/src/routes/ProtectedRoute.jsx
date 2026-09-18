import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';

// El DT solo ve su propia página de inscripción de jugadores; admin/superadmin
// no ven esa página (no tiene sentido para ellos, usan PlayersPage completa).
const HOME_BY_ROLE = {
  DT: '/dt/jugadores',
};

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <p className="p-8 text-slate-300">Comprobando sesión...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={HOME_BY_ROLE[user?.role] ?? '/dashboard'} replace />;
  }

  return <Outlet />;
}
