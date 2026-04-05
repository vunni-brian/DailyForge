import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './shell'
import { DashboardPage } from '../features/dashboard/page'
import { TasksPage } from '../features/tasks/page'
import { ProjectsPage } from '../features/projects/page'
import { NotesPage } from '../features/notes/page'
import { FocusPage } from '../features/focus/page'
import { LearningPage } from '../features/learning/page'
import { ReviewsPage } from '../features/reviews/page'
import { SettingsPage } from '../features/settings/page'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/notes" element={<NotesPage />} />
        <Route path="/learning" element={<LearningPage />} />
        <Route path="/focus" element={<FocusPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
