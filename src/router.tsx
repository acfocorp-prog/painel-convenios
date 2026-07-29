import { createHashRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { OverviewPage } from './features/overview/OverviewPage';
import { ConveniosListPage } from './features/convenios/ConveniosListPage';
import { ConvenioDetailPage } from './features/convenios/ConvenioDetailPage';
import { ConvenioFormPage } from './features/convenios/ConvenioFormPage';
import { EscolasListPage } from './features/escolas/EscolasListPage';
import { EscolaDetailPage } from './features/escolas/EscolaDetailPage';
import { EscolaFormPage } from './features/escolas/EscolaFormPage';
import { SignInPage } from './features/auth/SignInPage';
import { SignUpPage } from './features/auth/SignUpPage';
import { ConcluidosPage } from './features/concluidos/ConcluidosPage';
import { SimecListPage } from './features/simec/SimecListPage';
import { BienioListPage } from './features/bienios/BienioListPage';
import { MandatoListPage } from './features/mandatos/MandatoListPage';
import { SimecFormPage } from './features/simec/SimecFormPage';
import { SimecDetailPage } from './features/simec/SimecDetailPage';
import { BienioFormPage } from './features/bienios/BienioFormPage';
import { BienioDetailPage } from './features/bienios/BienioDetailPage';
import { MandatoFormPage } from './features/mandatos/MandatoFormPage';
import { MandatoDetailPage } from './features/mandatos/MandatoDetailPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { AvisosOficiaisPage } from './features/avisos-oficiais/AvisosOficiaisPage';

/**
 * Hash router funciona em qualquer static deploy sem precisar de regra de
 * rewrite. Cada rota vira `/#/caminho`, e o service worker serve o index.html
 * pra qualquer URL dentro do escopo.
 */
export const router = createHashRouter([
  { path: '/signin', element: <SignInPage /> },
  { path: '/signup', element: <SignUpPage /> },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'convenios', element: <ConveniosListPage /> },
      { path: 'convenios/novo', element: <ConvenioFormPage /> },
      { path: 'convenios/:id', element: <ConvenioDetailPage /> },
      { path: 'convenios/:id/editar', element: <ConvenioFormPage /> },
      { path: 'simec', element: <SimecListPage /> },
      { path: 'simec/novo', element: <SimecFormPage /> },
      { path: 'simec/:id', element: <SimecDetailPage /> },
      { path: 'simec/:id/editar', element: <SimecFormPage /> },
      { path: 'bienios', element: <BienioListPage /> },
      { path: 'bienios/novo', element: <BienioFormPage /> },
      { path: 'bienios/:id', element: <BienioDetailPage /> },
      { path: 'bienios/:id/editar', element: <BienioFormPage /> },
      { path: 'mandatos', element: <MandatoListPage /> },
      { path: 'mandatos/novo', element: <MandatoFormPage /> },
      { path: 'mandatos/:id', element: <MandatoDetailPage /> },
      { path: 'mandatos/:id/editar', element: <MandatoFormPage /> },
      { path: 'escolas', element: <EscolasListPage /> },
      { path: 'escolas/nova', element: <EscolaFormPage /> },
      { path: 'escolas/:id', element: <EscolaDetailPage /> },
      { path: 'escolas/:id/editar', element: <EscolaFormPage /> },
      { path: 'concluidos', element: <ConcluidosPage /> },
      { path: 'avisos-oficiais', element: <AvisosOficiaisPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
