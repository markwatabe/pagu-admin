import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedLayout } from './components/ProtectedLayout';
import { OrgRedirect } from './components/OrgRedirect';
import { LoginPage } from './pages/LoginPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { MenuIngredientsPage } from './pages/MenuIngredientsPage';
import { MenuRenderPage } from './pages/MenuRenderPage';
import { MenuRenderPrintPage } from './pages/MenuRenderPrintPage';
import { MenuPreviewPage } from './pages/MenuPreviewPage';
import { PublicMenuPreviewPage } from './pages/PublicMenuPreviewPage';
import { LayoutEditorPage, LayoutEditorPickerPage } from './pages/LayoutEditorPage';
import { RecipePage } from './pages/RecipePage';
import { IngredientsPage } from './pages/IngredientsPage';
import { ChartExamplesPage } from './pages/ChartExamplesPage';
import { FilesPage } from './pages/FilesPage';
import { AccountPage } from './pages/AccountPage';
import { OrgPage } from './pages/OrgPage';
import { DishesPage } from './pages/DishesPage';
import { DishPage } from './pages/DishPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlanPage } from './pages/PlanPage';
import { SkusPage } from './pages/SkusPage';
import { TableTestPage } from './pages/TableTestPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/:orgId/menu-preview" element={<PublicMenuPreviewPage />} />
        <Route element={<ProtectedLayout />}>
          {/* Root redirects to first org */}
          <Route index element={<OrgRedirect />} />

          {/* Org-scoped routes */}
          <Route path="/:orgId">
            {/* Pages with nav/footer */}
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="menu-ingredients" element={<MenuIngredientsPage />} />
              <Route path="menu-render" element={<MenuRenderPage />} />
              <Route path="recipes" element={<IngredientsPage />} />
              <Route path="dishes" element={<DishesPage />} />
              <Route path="dishes/:id" element={<DishPage />} />
              <Route path="recipe/:id" element={<RecipePage />} />
              <Route path="chart-examples" element={<ChartExamplesPage />} />
              <Route path="files" element={<FilesPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="org" element={<OrgPage />} />
              <Route path="menu" element={<LayoutEditorPickerPage />} />
              <Route path="plan" element={<PlanPage />} />
              <Route path="skus" element={<SkusPage />} />
            </Route>
            {/* Full-page views — no AppLayout nav */}
            <Route path="table-test" element={<TableTestPage />} />
            <Route path="menu-render-print/:id" element={<MenuRenderPrintPage />} />
            <Route path="menu-preview" element={<MenuPreviewPage />} />
            <Route path="menu/:id" element={<LayoutEditorPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
