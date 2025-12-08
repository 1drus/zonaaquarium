import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Fish } from 'lucide-react';

type AuthView = 'auth' | 'forgot-password';

const Auth = () => {
  const [activeTab, setActiveTab] = useState<string>('login');
  const [view, setView] = useState<AuthView>('auth');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  if (view === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/10 p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <Fish className="h-12 w-12 text-primary mb-2" />
            <h1 className="text-3xl font-bold text-foreground">Zona Aquarium</h1>
            <p className="text-muted-foreground text-center mt-2">
              Platform jual beli ikan hias terpercaya
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <ForgotPasswordForm onBack={() => setView('auth')} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/10 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Fish className="h-12 w-12 text-primary mb-2" />
          <h1 className="text-3xl font-bold text-foreground">Zona Aquarium</h1>
          <p className="text-muted-foreground text-center mt-2">
            Platform jual beli ikan hias terpercaya
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Selamat Datang</CardTitle>
            <CardDescription>
              Masuk atau daftar untuk melanjutkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Masuk</TabsTrigger>
                <TabsTrigger value="register">Daftar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <LoginForm onForgotPassword={() => setView('forgot-password')} />
              </TabsContent>
              
              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
