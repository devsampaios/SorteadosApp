import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ToastProvider } from './toast/ToastContext';
import { AuthProvider } from './context/authContext';
import { AuthGuard, PublicGuard } from './components/AuthGuard';
import AppErrorBridge from './components/AppErrorBridge';
import PanelView from './components/PanelView';
import InicioView from './views/InicioView';
import ConfiguracoesView from './views/ConfiguracoesView';
import UsuariosView from './views/UsuariosView';
import AdminView from './views/AdminView';
import AuditoriaView from './views/AuditoriaView';
import LoginView from './views/LoginView';

import 'bootstrap/dist/css/bootstrap-grid.min.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/responsive.css';

const routes = createBrowserRouter([
  {
    element: <PublicGuard />,
    children: [
      { path: '/login', element: <LoginView /> },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        path: '/',
        element: <PanelView />,
        children: [
          { path: '', element: <InicioView /> },
          { path: 'configuracoes', element: <ConfiguracoesView /> },
          { path: 'admin', element: <AdminView /> },
          { path: 'admin/usuarios', element: <UsuariosView /> },
          { path: 'admin/auditoria', element: <AuditoriaView /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <AppErrorBridge />
        <RouterProvider router={routes} />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
);
