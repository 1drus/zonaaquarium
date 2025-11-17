import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { profileSchema, ProfileFormData } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
export function ProfileEditForm() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const {
    user,
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    register,
    handleSubmit,
    setValue,
    formState: {
      errors
    }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema)
  });
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);
  const loadProfile = async () => {
    if (!user) return;
    const {
      data,
      error
    } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data && !error) {
      setValue('fullName', data.full_name || '');
      setValue('phone', data.phone || '');
      setValue('bio', data.bio || '');
      setAvatarUrl(data.avatar_url || '');
    }
  };
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) {
      return;
    }
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;
    setUploading(true);

    // Upload to storage
    const {
      error: uploadError
    } = await supabase.storage.from('profile-images').upload(filePath, file);
    if (uploadError) {
      toast({
        variant: "destructive",
        title: "Upload gagal",
        description: uploadError.message
      });
      setUploading(false);
      return;
    }

    // Get public URL
    const {
      data: {
        publicUrl
      }
    } = supabase.storage.from('profile-images').getPublicUrl(filePath);

    // Update profile with new avatar URL
    const {
      error: updateError
    } = await supabase.from('profiles').update({
      avatar_url: publicUrl
    }).eq('id', user.id);
    if (updateError) {
      toast({
        variant: "destructive",
        title: "Update gagal",
        description: updateError.message
      });
    } else {
      setAvatarUrl(publicUrl);
      toast({
        title: "Foto profil berhasil diupdate"
      });
    }
    setUploading(false);
  };
  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setLoading(true);
    const {
      error
    } = await supabase.from('profiles').update({
      full_name: data.fullName,
      phone: data.phone || null,
      bio: data.bio || null
    }).eq('id', user.id);
    if (error) {
      toast({
        variant: "destructive",
        title: "Update gagal",
        description: error.message
      });
    } else {
      toast({
        title: "Profil berhasil diupdate"
      });
    }
    setLoading(false);
  };
  const handleLogout = async () => {
    await signOut();
  };
  return <Card className="max-w-2xl my-0 px-0 mx-[100px]">
      <CardHeader>
        <CardTitle>Edit Profil</CardTitle>
        <CardDescription>Update informasi profil Anda</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <Label htmlFor="avatar" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {uploading ? <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengupload...
                  </> : <>
                    <Upload className="h-4 w-4" />
                    Ubah foto profil
                  </>}
              </div>
            </Label>
            <Input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ''} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <Input id="fullName" {...register('fullName')} disabled={loading} />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Nomor Telepon</Label>
            <Input id="phone" type="tel" {...register('phone')} disabled={loading} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" placeholder="Ceritakan tentang diri Anda..." rows={4} {...register('bio')} disabled={loading} />
            {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </> : 'Simpan Perubahan'}
            </Button>
            
            <Button type="button" variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>;
}