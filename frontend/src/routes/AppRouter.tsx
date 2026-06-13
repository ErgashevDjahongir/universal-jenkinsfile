import { Route, Routes } from 'react-router-dom';
import { UserRole } from '@/auth/roles';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { TestLayout } from '@/layouts/TestLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { StartPage } from '@/pages/test/StartPage';
import { TestRunnerPage } from '@/pages/test/TestRunnerPage';
import { QuestionsPage } from '@/pages/questions/QuestionsPage';
import { SubjectsPage } from '@/pages/questions/SubjectsPage';
import { QuestionFormPage } from '@/pages/questions/QuestionFormPage';
import { TemplatesPage } from '@/pages/templates/TemplatesPage';
import { TemplateFormPage } from '@/pages/templates/TemplateFormPage';
import { AssignmentsPage } from '@/pages/assignments/AssignmentsPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { DepartmentsPage } from '@/pages/users/DepartmentsPage';
import { SessionsPage } from '@/pages/results/SessionsPage';
import { SessionDetailPage } from '@/pages/results/SessionDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { HomeRedirect } from './HomeRedirect';
import { ProtectedRoute } from './ProtectedRoute';

const STAFF = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EXPERT];
const ADMIN = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        {/* Test topshiruvchi kod orqali kiradi (autentifikatsiyasiz) */}
        <Route path="/start" element={<StartPage />} />
      </Route>

      {/* Barcha autentifikatsiya bo'lgan foydalanuvchilar uchun profil */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Natijalar/monitoring — ekspert ham ko'radi (o'zgartirish faqat admin) */}
      <Route element={<ProtectedRoute roles={STAFF} />}>
        <Route element={<AppLayout />}>
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/results/:id" element={<SessionDetailPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Route>

      {/* Faqat administratorlar — savollar banki, shablonlar, tayinlovlar, foydalanuvchilar.
          Ekspert savollar bankiga (va dashboard'ga) kira olmaydi (qaror: ekspert ko'rinishi). */}
      <Route element={<ProtectedRoute roles={ADMIN} />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/questions" element={<QuestionsPage />} />
          <Route path="/questions/new" element={<QuestionFormPage />} />
          <Route path="/questions/:id/edit" element={<QuestionFormPage />} />
          <Route path="/questions/subjects" element={<SubjectsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/templates/new" element={<TemplateFormPage />} />
          <Route path="/templates/:id/edit" element={<TemplateFormPage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
        </Route>
      </Route>

      {/* Test topshiruvchi */}
      <Route element={<ProtectedRoute roles={[UserRole.EXAMINEE]} />}>
        <Route element={<TestLayout />}>
          <Route path="/test/:sessionId" element={<TestRunnerPage />} />
        </Route>
      </Route>

      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
