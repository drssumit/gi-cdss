import { Toaster } from "@/components/ui/sonner";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import ClinicalReportPage from "./pages/ClinicalReport";
import DashboardPage from "./pages/Dashboard";
import LoginPage from "./pages/Login";
import QuestionnairePage from "./pages/Questionnaire";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/dashboard" />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const questionnaireRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/questionnaire",
  validateSearch: (search: Record<string, unknown>) => ({
    doctorId: search.doctorId ? String(search.doctorId) : undefined,
  }),
  component: QuestionnairePage,
});

const reportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/report",
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: search.sessionId ? String(search.sessionId) : undefined,
  }),
  component: ClinicalReportPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  dashboardRoute,
  questionnaireRoute,
  reportRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
