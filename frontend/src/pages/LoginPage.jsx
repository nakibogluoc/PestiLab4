import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Beaker } from 'lucide-react';
import { login as apiLogin } from '@/api';  // ✅ yeni helper importu

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ axios yerine helper fonksiyonu kullan
      const data = await apiLogin(username, password);
      onLogin(data.access_token, data.user);
      toast.success('Login successful!');
    } catch (error) {
      const msg = error?.message || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 50%, #a5d6a7 100%)',
      }}
    >
      <Card className="w-full max-w-md shadow-2xl" data-testid="login-card">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-green-100 rounded-full">
              <Beaker className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-800">PestiLab</CardTitle>
          <CardDescription className="text-base">
            Laboratory Stock & Labeling System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                data-testid="login-username-input"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              data-testid="login-submit-button"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2 font-medium">Default Credentials:</p>
            <p className="text-xs text-gray-500">
              Username: <strong>admin</strong>
            </p>
            <p className="text-xs text-gray-500">
              Password: <strong>admin123</strong>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
