import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import DemoDataBanner from '../common/DemoDataBanner';
import ToastContainer from '../common/ToastContainer';
import ErrorBoundary from '../common/ErrorBoundary';

export default function AppLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <DemoDataBanner />
      <Navbar
        isMobileSidebarOpen={isMobileSidebarOpen}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      <div className="flex-1 flex">
        <Sidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area (offset by sidebar width on lg screens) */}
        <main className="flex-1 lg:pl-64 flex flex-col min-w-0 transition-all">
          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <ErrorBoundary level="page" title="Page Rendering Error" message="An error occurred while loading this page view. You can retry or return to the main dashboard.">
              <Outlet />
            </ErrorBoundary>
          </div>

          <footer className="py-6 px-8 border-t border-slate-200/80 bg-white text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>
              SquadSync — Continuous Git & Task Collaboration Risk Monitoring for Student Software Engineering.
            </p>
            <p className="text-slate-400">
              Designed for Hackathon & Senior Capstone Mentorship.
            </p>
          </footer>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
