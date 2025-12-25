import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import HomePage from '../pages/HomePage'
import DashboardPage from '../pages/DashboardPage'
import ServersPage from '../pages/ServersPage'
import SyncFoldersPage from '../pages/SyncFoldersPage'
import LogsPage from '../pages/LogsPage'
import SettingsPage from '../pages/SettingsPage'
import AboutPage from '../pages/AboutPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'servers',
        element: <ServersPage />,
      },
      {
        path: 'folders',
        element: <SyncFoldersPage />,
      },
      {
        path: 'logs',
        element: <LogsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'about',
        element: <AboutPage />,
      },
    ],
  },
])

export const AppRouter = () => <RouterProvider router={router} />
