import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from '../context/AuthContext.jsx';
import { NotificationProvider } from '../context/NotificationContext.jsx';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import AdminsPage from '../pages/AdminsPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import TournamentsPage from '../pages/TournamentsPage.jsx';
import TeamsPage from '../pages/TeamsPage.jsx';
import MatchesPage from '../pages/MatchesPage.jsx';
import StandingsPage from '../pages/StandingsPage.jsx';
import GoleadoresPage from '../pages/GoleadoresPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import HomePage from '../pages/HomePage.jsx';
import PublicTournamentPage from '../pages/PublicTournamentPage.jsx';
import AnnouncementsPage from '../pages/AnnouncementsPage.jsx';
import FloatingBubblesPage from '../pages/FloatingBubblesPage.jsx';
import PlayersPage from '../pages/PlayersPage.jsx';
import GroupsPage from '../pages/GroupsPage.jsx';
import BracketPage from '../pages/BracketPage.jsx';
import TournamentWorkspacePage from '../pages/TournamentWorkspacePage.jsx';
import FloatingBubbles from '../components/FloatingBubbles.jsx';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <NotificationProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/tournaments/:id" element={<PublicTournamentPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/tournaments" element={<TournamentsPage />} />
                <Route path="/dashboard/tournaments/:id" element={<TournamentWorkspacePage />} />
                <Route path="/dashboard/tournaments/:tournamentId/teams/:teamId/players" element={<PlayersPage />} />
                <Route path="/dashboard/admins" element={<AdminsPage />} />
                <Route path="/dashboard/teams" element={<TeamsPage />} />
                <Route path="/dashboard/matches" element={<MatchesPage />} />
                <Route path="/dashboard/standings" element={<StandingsPage />} />
                <Route path="/dashboard/goleadores" element={<GoleadoresPage />} />
                <Route path="/dashboard/groups" element={<GroupsPage />} />
                <Route path="/dashboard/bracket" element={<BracketPage />} />
                <Route path="/dashboard/announcements" element={<AnnouncementsPage />} />
                <Route path="/dashboard/floating-bubbles" element={<FloatingBubblesPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <FloatingBubbles />
          </AuthProvider>
        </NotificationProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
