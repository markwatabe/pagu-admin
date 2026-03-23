import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedLayout } from './components/ProtectedLayout';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { MenuBuilderPage } from './pages/MenuBuilderPage';
import { MenuIngredientsPage } from './pages/MenuIngredientsPage';
import { MenuRenderPage } from './pages/MenuRenderPage';
import { MenuRenderPrintPage } from './pages/MenuRenderPrintPage';
import { MenuPreviewPage } from './pages/MenuPreviewPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          {/* Pages with nav/footer */}
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/users" replace />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/menu-builder" element={<MenuBuilderPage />} />
            <Route path="/menu-ingredients" element={<MenuIngredientsPage />} />
            <Route path="/menu-render" element={<MenuRenderPage />} />
          </Route>
          {/* Full-page views — no AppLayout nav */}
          <Route path="/menu-render-print" element={<MenuRenderPrintPage />} />
          <Route path="/menu-preview" element={<MenuPreviewPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
