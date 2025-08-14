import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/toaster';
import DashboardHomePage from './features/dashboard/DashboardHomePage';
import { EnvelopesPage } from './features/envelopes/EnvelopesPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import SettingsPage from './features/settings/SettingsPage';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

// Mock data for demo
const mockBudgetData = {
  envelopes: [
    { id: 1, name: 'Groceries', amount: 500, spent: 320, remaining: 180 },
    { id: 2, name: 'Gas', amount: 200, spent: 150, remaining: 50 },
    { id: 3, name: 'Entertainment', amount: 300, spent: 120, remaining: 180 },
  ],
  transactions: [
    { id: 1, amount: 50, description: 'Grocery Store', type: 'EXPENSE', date: new Date().toISOString(), envelopeId: 1 },
    { id: 2, amount: 30, description: 'Gas Station', type: 'EXPENSE', date: new Date().toISOString(), envelopeId: 2 },
  ]
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          {/* Navigation */}
          <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">
                    💰 Beautiful Budget Platform
                  </h1>
                </div>
                <div className="flex items-center space-x-8">
                  <Link to="/" className="text-gray-700 hover:text-blue-600 transition-colors">
                    Dashboard
                  </Link>
                  <Link to="/envelopes" className="text-gray-700 hover:text-blue-600 transition-colors">
                    Envelopes
                  </Link>
                  <Link to="/transactions" className="text-gray-700 hover:text-blue-600 transition-colors">
                    Transactions
                  </Link>
                  <Link to="/settings" className="text-gray-700 hover:text-blue-600 transition-colors">
                    Settings
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<DashboardHomePage />} />
              <Route path="/envelopes" element={<EnvelopesPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;