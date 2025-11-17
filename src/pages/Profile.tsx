import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { AddressList } from '@/components/profile/AddressList';
import { ActivityTimeline } from '@/components/profile/ActivityTimeline';
import { Loader2, User, Mail, Phone, Award, ShoppingBag, TrendingUp, MapPin, Clock } from 'lucide-react';

interface Profile {
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
}

interface MemberData {
  current_tier: string;
  total_spending: number;
  order_count: number;
}

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;

    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      } else if (profileData) {
        setProfile(profileData);
      }

      // Load member progress with maybeSingle to handle missing data gracefully
      const { data: memberProgressData, error: memberError } = await supabase
        .from('member_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) {
        console.error('Error loading member progress:', memberError);
      }
      
      // Set member data with defaults if null
      setMemberData(memberProgressData || {
        current_tier: 'Bronze',
        total_spending: 0,
        order_count: 0,
      });
    } catch (error) {
      console.error('Error loading profile data:', error);
      // Set default member data on error
      setMemberData({
        current_tier: 'Bronze',
        total_spending: 0,
        order_count: 0,
      });
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat profil...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTierColor = (tier: string) => {
    const colors = {
      Bronze: 'from-accent/20 to-accent/5 border-accent/30',
      Silver: 'from-muted via-muted/50 to-muted/20 border-muted-foreground/30',
      Gold: 'from-accent-light/20 to-accent/10 border-accent-light/30',
      Platinum: 'from-primary-light/20 to-primary/10 border-primary/30',
    };
    return colors[tier as keyof typeof colors] || colors.Bronze;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/10 to-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8 max-w-4xl">
        {/* Profile Header */}
        <Card className="overflow-hidden border-2 hover:border-primary/30 transition-all duration-500 hover:shadow-xl">
          <div className={`h-32 bg-gradient-to-br ${getTierColor(memberData?.current_tier || 'Bronze')} relative overflow-hidden`}>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzYuNjI3IDAgMTIgNS4zNzMgMTIgMTJzLTUuMzczIDEyLTEyIDEyLTEyLTUuMzczLTEyLTEyIDUuMzczLTEyIDEyLTEyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          </div>
          <CardContent className="relative px-4 sm:px-6 pb-4 sm:pb-6 pt-20">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <div className="relative flex flex-col items-center gap-3 -mt-20">
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:bg-primary/30 transition-all duration-500" />
                  <Avatar className="h-32 w-32 border-4 border-background shadow-2xl relative z-10 group-hover:scale-105 transition-transform duration-500">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                      {profile?.full_name ? getInitials(profile.full_name) : <User className="h-12 w-12" />}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <Badge className="px-4 py-1.5 shadow-lg bg-gradient-to-r from-primary via-secondary to-primary text-primary-foreground font-bold whitespace-nowrap">
                  {memberData?.current_tier || 'Bronze'}
                </Badge>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center sm:text-left space-y-3 sm:pt-0">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                  {profile?.full_name || 'User'}
                </h1>
                <div className="flex flex-col sm:flex-row gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>{user.email}</span>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <Phone className="h-4 w-4 text-secondary" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="group overflow-hidden border-2 hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:scale-105 hover:-translate-y-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-500">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">Tier Saat Ini</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {memberData?.current_tier || 'Bronze'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group overflow-hidden border-2 hover:border-secondary/50 transition-all duration-500 hover:shadow-xl hover:scale-105 hover:-translate-y-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 group-hover:from-secondary/30 group-hover:to-secondary/10 transition-all duration-500">
                  <ShoppingBag className="h-8 w-8 text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">Total Pesanan</p>
                  <p className="text-2xl font-bold text-foreground">
                    {memberData?.order_count || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group overflow-hidden border-2 hover:border-accent/50 transition-all duration-500 hover:shadow-xl hover:scale-105 hover:-translate-y-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 group-hover:from-accent/30 group-hover:to-accent/10 transition-all duration-500">
                  <TrendingUp className="h-8 w-8 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">Total Belanja</p>
                  <p className="text-xl font-bold text-foreground">
                    Rp {(memberData?.total_spending || 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Card className="border-2">
          <CardContent className="p-4 sm:p-6">
            <Tabs defaultValue="activity" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8 p-1 bg-muted/30 rounded-xl h-auto gap-1">
                <TabsTrigger 
                  value="activity" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg rounded-lg py-3 font-semibold transition-all duration-300 flex items-center gap-2 text-xs sm:text-sm"
                >
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Aktivitas</span>
                  <span className="sm:hidden">Aktivitas</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="profile" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg rounded-lg py-3 font-semibold transition-all duration-300 flex items-center gap-2 text-xs sm:text-sm"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Informasi Profil</span>
                  <span className="sm:hidden">Profil</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="addresses" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg rounded-lg py-3 font-semibold transition-all duration-300 flex items-center gap-2 text-xs sm:text-sm"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Alamat</span>
                  <span className="sm:hidden">Alamat</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="activity" className="mt-0 animate-fade-in">
                <ActivityTimeline />
              </TabsContent>
              
              <TabsContent value="profile" className="mt-0 animate-fade-in">
                <ProfileEditForm />
              </TabsContent>
              
              <TabsContent value="addresses" className="mt-0 animate-fade-in">
                <AddressList />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
