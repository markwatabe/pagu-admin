import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ProtectedLayout } from './components/ProtectedLayout';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';
import { ReviewsPage } from './pages/ReviewsPage';

import { MenuIngredientsPage } from './pages/MenuIngredientsPage';
import { MenuRenderPage } from './pages/MenuRenderPage';
import { MenuRenderPrintPage } from './pages/MenuRenderPrintPage';
import { MenuPreviewPage } from './pages/MenuPreviewPage';
import { LayoutEditorPage, LayoutEditorPickerPage } from './pages/LayoutEditorPage';
import { IngredientPage } from './pages/IngredientPage';
import { IngredientsPage } from './pages/IngredientsPage';
import { RecipesPage } from './pages/RecipesPage';
import { ChartExamplesPage } from './pages/ChartExamplesPage';
import { UploadImagePage } from './pages/UploadImagePage';
import { DishesPage } from './pages/DishesPage';
import { DishPage } from './pages/DishPage';

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
            <Route path="/menu-ingredients" element={<MenuIngredientsPage />} />
            <Route path="/menu-render" element={<MenuRenderPage />} />
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/dishes" element={<DishesPage />} />
            <Route path="/dishes/:id" element={<DishPage />} />
            <Route path="/ingredients" element={<IngredientsPage />} />
            <Route path="/ingredient/:id" element={<IngredientPage />} />
            <Route path="/chart-examples" element={<ChartExamplesPage />} />
            <Route path="/upload-image" element={<UploadImagePage />} />
            <Route path="/menu" element={<LayoutEditorPickerPage />} />
          </Route>
          {/* Full-page views — no AppLayout nav */}
          <Route path="/menu-render-print/:id" element={<MenuRenderPrintPage />} />
          <Route path="/menu-preview" element={<MenuPreviewPage />} />
          <Route path="/menu/:id" element={<LayoutEditorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
