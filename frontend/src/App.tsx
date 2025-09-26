import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Generation from './pages/Generation';
import Export from './pages/Export';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import { useAppStore } from './stores/useAppStore';

function App() {
  const { toasts, removeToast } = useAppStore();

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen relative overflow-hidden">
          {/* Animated Background */}
          <div className="fixed inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-purple-500/10 to-cyan-500/10"></div>
            
            {/* Floating Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-40" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/generate/:id" element={<Generation />} />
              <Route path="/export/:id" element={<Export />} />
            </Routes>
          </div>
          
          {/* Toast Notifications */}
          <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
