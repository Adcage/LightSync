import React from 'react';
import { Outlet } from 'react-router-dom';
import { TitleBar } from '../components/TitleBar';
import { ThemeSwitch } from '../components/ThemeSwitch';
import LanguageSwitch from '../components/LanguageSwitch';

const MainLayout: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 overflow-hidden">
      <TitleBar />
      <div className="fixed top-14 right-4 z-50">
        <ThemeSwitch />
      </div>
      <div className="fixed top-14 right-20 z-50">
        <LanguageSwitch />
      </div>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
