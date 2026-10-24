import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RoleRedirect } from "@/components/layout/RoleRedirect";
import { LandingPage } from "@/pages/public/LandingPage";
import { LoginPage } from "@/pages/public/LoginPage";
import { RegisterPage } from "@/pages/public/RegisterPage";
import { TrackPage } from "@/pages/public/TrackPage";
import { NotFoundPage } from "@/pages/public/NotFoundPage";
import { MyComplaintsPage } from "@/pages/student/MyComplaintsPage";
import { NewComplaintPage } from "@/pages/student/NewComplaintPage";
import { FeedPage } from "@/pages/student/FeedPage";
import { ComplaintDetailPage } from "@/pages/shared/ComplaintDetailPage";
import { EditComplaintPage } from "@/pages/shared/EditComplaintPage";
import { ProfilePage } from "@/pages/shared/ProfilePage";
import { QueuePage } from "@/pages/staff/QueuePage";
import { DashboardPage } from "@/pages/admin/DashboardPage";
import { AllComplaintsPage } from "@/pages/admin/AllComplaintsPage";
import { CategoriesPage } from "@/pages/admin/CategoriesPage";
import { DepartmentsPage } from "@/pages/admin/DepartmentsPage";
import { UsersPage } from "@/pages/admin/UsersPage";

function ComplaintsHomePage() {
  const { user } = useAuth();
  return user?.role === "ADMIN" ? <AllComplaintsPage /> : <MyComplaintsPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/track/:ticketCode" element={<TrackPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/app" element={<RoleRedirect />} />
            <Route path="/app/complaints" element={<ComplaintsHomePage />} />
            <Route path="/app/complaints/new" element={<NewComplaintPage />} />
            <Route path="/app/complaints/:id" element={<ComplaintDetailPage />} />
            <Route path="/app/complaints/:id/edit" element={<EditComplaintPage />} />
            <Route path="/app/feed" element={<FeedPage />} />
            <Route path="/app/profile" element={<ProfilePage />} />
            <Route element={<ProtectedRoute roles={["STAFF", "ADMIN"]} />}>
              <Route path="/app/queue" element={<QueuePage />} />
              <Route path="/app/dashboard" element={<DashboardPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
              <Route path="/app/admin/categories" element={<CategoriesPage />} />
              <Route path="/app/admin/departments" element={<DepartmentsPage />} />
              <Route path="/app/admin/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="/app/*" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
