import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Beaker, LayoutDashboard, FlaskConical, Scale, FileText, LogOut, User } from 'lucide-react';

export default function Layout({ user, onLogout }) {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/compounds', icon: FlaskConical, label: 'Compounds' },
    { path: '/weighing', icon: Scale, label: 'Weighing' },
    { path: '/records', icon: FileText, label: 'Records' }
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex" style={{
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf0 100%)'
    }}>
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <Link to="/" className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Beaker className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">PestiLab</h1>
              <p className="text-xs text-gray-500">Lab Management</p>
            </div>
          </Link>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={
                  `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                    isActive(item.path)
                      ? 'bg-green-50 text-green-700 border-l-4 border-green-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="p-2 bg-gray-100 rounded-full">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <Button
            onClick={onLogout}
            data-testid="logout-button"
            variant="outline"
            className="w-full flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}