import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Medal, Award, Crown, Gem, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { TierDialog } from './TierDialog';

interface TierConfig {
  id: string;
  tier_name: string;
  tier_level: number;
  min_spending: number;
  max_spending: number | null;
  discount_percentage: number;
  free_shipping_threshold: number | null;
  badge_color: string;
  badge_icon: string;
  created_at: string;
}

const getTierIcon = (iconName: string) => {
  const icons = {
    Award: Award,
    Medal: Medal,
    Crown: Crown,
    Gem: Gem,
  };
  const Icon = icons[iconName as keyof typeof icons] || Medal;
  return <Icon className="h-5 w-5" />;
};

export const TierConfigManagement = () => {
  const { toast } = useToast();
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierConfig | null>(null);
  const [tierToDelete, setTierToDelete] = useState<TierConfig | null>(null);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('member_tier_config')
        .select('*')
        .order('tier_level');

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error('Error loading tiers:', error);
      toast({
        title: 'Error',
        description: 'Gagal memuat konfigurasi tier',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tier: TierConfig) => {
    setSelectedTier(tier);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedTier(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (tier: TierConfig) => {
    setTierToDelete(tier);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!tierToDelete) return;

    try {
      const { error } = await supabase
        .from('member_tier_config')
        .delete()
        .eq('id', tierToDelete.id);

      if (error) throw error;

      toast({
        title: 'Berhasil',
        description: `Tier ${tierToDelete.tier_name} berhasil dihapus`,
      });

      loadTiers();
    } catch (error) {
      console.error('Error deleting tier:', error);
      toast({
        title: 'Error',
        description: 'Gagal menghapus tier',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setTierToDelete(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
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
          <div className="flex items-center justify-between">
            <CardTitle>Konfigurasi Member Tier</CardTitle>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Tier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tiers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Medal className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Belum ada tier yang dikonfigurasi</p>
              <Button onClick={handleAdd} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Tier Pertama
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead>Nama Tier</TableHead>
                    <TableHead>Icon</TableHead>
                    <TableHead>Min Spending</TableHead>
                    <TableHead>Max Spending</TableHead>
                    <TableHead>Diskon</TableHead>
                    <TableHead>Free Shipping</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers.map((tier) => (
                    <TableRow key={tier.id}>
                      <TableCell>
                        <Badge variant="outline">{tier.tier_level}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{tier.tier_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTierIcon(tier.badge_icon)}
                          <span className="text-xs text-muted-foreground">{tier.badge_icon}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(tier.min_spending)}</TableCell>
                      <TableCell>
                        {tier.max_spending ? formatCurrency(tier.max_spending) : 'Unlimited'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{tier.discount_percentage}%</Badge>
                      </TableCell>
                      <TableCell>
                        {tier.free_shipping_threshold
                          ? formatCurrency(tier.free_shipping_threshold)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(tier)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(tier)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tier={selectedTier}
        onSuccess={loadTiers}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tier?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus tier {tierToDelete?.tier_name}? Tindakan ini tidak
              dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
