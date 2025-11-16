import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { AddressList } from '@/components/profile/AddressList';
import { MemberProgress } from '@/components/profile/MemberProgress';
import { Loader2 } from 'lucide-react';

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Profil Saya</h1>
        
        <Tabs defaultValue="member" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="member">Member Progress</TabsTrigger>
            <TabsTrigger value="profile">Informasi Profil</TabsTrigger>
            <TabsTrigger value="addresses">Alamat Pengiriman</TabsTrigger>
          </TabsList>
          
          <TabsContent value="member" className="mt-6">
            <MemberProgress />
          </TabsContent>
          
          <TabsContent value="profile" className="mt-6">
            <ProfileEditForm />
          </TabsContent>
          
          <TabsContent value="addresses" className="mt-6">
            <AddressList />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
