import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AddressDialog } from './AddressDialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, MapPin, Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Address {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  kelurahan: string;
  kecamatan: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
}

export function AddressList() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user]);

  const loadAddresses = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (data && !error) {
      setAddresses(data);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Hapus gagal",
        description: error.message
      });
    } else {
      toast({
        title: "Alamat berhasil dihapus",
      });
      loadAddresses();
    }
    
    setDeleteId(null);
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingAddress(null);
    setDialogOpen(true);
  };

  const handleDialogClose = (shouldRefresh?: boolean) => {
    setDialogOpen(false);
    setEditingAddress(null);
    if (shouldRefresh) {
      loadAddresses();
    }
  };

  if (loading) {
    return <div>Memuat alamat...</div>;
  }

  return (
    <>
      <Card className="max-w-4xl border-2">
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl sm:text-2xl">Alamat Pengiriman</CardTitle>
              <CardDescription>Kelola alamat pengiriman Anda</CardDescription>
            </div>
            <Button onClick={handleAddNew} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Alamat
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {addresses.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MapPin className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Belum ada alamat tersimpan</p>
              <Button onClick={handleAddNew} variant="outline" className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Tambah Alamat Pertama
              </Button>
            </div>
          ) : (
            addresses.map((address) => (
              <Card key={address.id} className="relative border-2 hover:border-primary/30 transition-all duration-300">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base sm:text-lg">{address.label}</h3>
                      {address.is_default && (
                        <Badge variant="secondary" className="text-xs">Utama</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(address)}
                        className="h-9 w-9"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(address.id)}
                        className="h-9 w-9"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-sm space-y-1.5">
                    <p className="font-medium text-foreground">{address.recipient_name}</p>
                    <p className="text-muted-foreground">{address.phone}</p>
                    <p className="text-muted-foreground leading-relaxed">
                      {address.address_line}
                    </p>
                    <p className="text-muted-foreground">
                      {address.kelurahan}, {address.kecamatan}
                    </p>
                    <p className="text-muted-foreground">
                      {address.city}, {address.province} {address.postal_code}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <AddressDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        address={editingAddress}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Alamat</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus alamat ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
