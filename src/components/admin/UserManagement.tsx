import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, ShieldOff, Mail, Phone, Calendar } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  email?: string;
  roles: string[];
}

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionType, setActionType] = useState<'promote' | 'demote'>('promote');
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get user emails from auth (using RPC or direct query won't work due to RLS)
      // We'll fetch emails separately for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get email from auth.users via admin API won't work in client
          // We'll need to store email in profiles or use a different approach
          const roles = (userRoles || [])
            .filter((r) => r.user_id === profile.id)
            .map((r) => r.role);

          return {
            ...profile,
            roles,
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat data pengguna',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = (user: UserProfile) => {
    setSelectedUser(user);
    setActionType('promote');
    setDialogOpen(true);
  };

  const handleDemote = (user: UserProfile) => {
    setSelectedUser(user);
    setActionType('demote');
    setDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(selectedUser.id);

      if (actionType === 'promote') {
        const { error } = await supabase.rpc('set_user_role', {
          _user_id: selectedUser.id,
          _role: 'admin',
        });

        if (error) throw error;

        toast({
          title: 'Berhasil',
          description: `${selectedUser.full_name} telah dipromosikan menjadi admin`,
        });
      } else {
        const { error } = await supabase.rpc('remove_user_role', {
          _user_id: selectedUser.id,
          _role: 'admin',
        });

        if (error) throw error;

        toast({
          title: 'Berhasil',
          description: `Role admin ${selectedUser.full_name} telah dihapus`,
        });
      }

      await loadUsers();
      setDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal mengubah role pengguna',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <p className="text-sm text-muted-foreground">
            Kelola role pengguna - promote atau demote sebagai admin
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => {
              const isAdmin = user.roles.includes('admin');
              const initials = user.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{user.full_name}</h3>
                        {isAdmin && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary flex-shrink-0">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                        {user.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span className="truncate">{user.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 flex-shrink-0" />
                          <span>Bergabung {new Date(user.created_at).toLocaleDateString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:flex-shrink-0 self-end sm:self-auto">
                    {isAdmin ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDemote(user)}
                        disabled={actionLoading === user.id}
                        className="w-full sm:w-auto"
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <ShieldOff className="h-4 w-4 mr-2" />
                            Hapus Admin
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handlePromote(user)}
                        disabled={actionLoading === user.id}
                        className="w-full sm:w-auto"
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Jadikan Admin
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {users.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Belum ada pengguna terdaftar
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'promote' ? 'Promote Pengguna' : 'Hapus Role Admin'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'promote' ? (
                <>
                  Apakah Anda yakin ingin menjadikan{' '}
                  <span className="font-semibold">{selectedUser?.full_name}</span> sebagai
                  admin? Admin memiliki akses penuh ke dashboard dan dapat mengelola
                  seluruh sistem.
                </>
              ) : (
                <>
                  Apakah Anda yakin ingin menghapus role admin dari{' '}
                  <span className="font-semibold">{selectedUser?.full_name}</span>? Pengguna
                  akan kehilangan akses ke admin dashboard.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {actionType === 'promote' ? 'Ya, Promote' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
