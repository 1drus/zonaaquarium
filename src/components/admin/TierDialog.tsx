import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const tierSchema = z.object({
  tier_name: z.string().min(1, 'Nama tier wajib diisi').max(50, 'Maksimal 50 karakter'),
  tier_level: z.number().int().min(1, 'Level minimal 1').max(100, 'Level maksimal 100'),
  min_spending: z.number().min(0, 'Minimal spending harus >= 0'),
  max_spending: z.number().nullable(),
  discount_percentage: z.number().int().min(0, 'Diskon minimal 0%').max(100, 'Diskon maksimal 100%'),
  free_shipping_threshold: z.number().nullable(),
  badge_color: z.string().min(1, 'Badge color wajib diisi'),
  badge_icon: z.string().min(1, 'Badge icon wajib diisi'),
});

type TierFormData = z.infer<typeof tierSchema>;

interface TierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: any | null;
  onSuccess: () => void;
}

const ICON_OPTIONS = [
  { value: 'Medal', label: 'Medal 🥉' },
  { value: 'Award', label: 'Award 🏆' },
  { value: 'Crown', label: 'Crown 👑' },
  { value: 'Gem', label: 'Gem 💎' },
];

const COLOR_OPTIONS = [
  { value: 'accent', label: 'Accent (Bronze)' },
  { value: 'muted', label: 'Muted (Silver)' },
  { value: 'accent-light', label: 'Accent Light (Gold)' },
  { value: 'primary', label: 'Primary (Platinum)' },
];

export const TierDialog = ({ open, onOpenChange, tier, onSuccess }: TierDialogProps) => {
  const { toast } = useToast();
  const isEdit = !!tier;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<TierFormData>({
    resolver: zodResolver(tierSchema),
    defaultValues: {
      tier_name: '',
      tier_level: 1,
      min_spending: 0,
      max_spending: null,
      discount_percentage: 0,
      free_shipping_threshold: null,
      badge_color: 'accent',
      badge_icon: 'Medal',
    },
  });

  const badgeIcon = watch('badge_icon');
  const badgeColor = watch('badge_color');

  useEffect(() => {
    if (tier && open) {
      reset({
        tier_name: tier.tier_name,
        tier_level: tier.tier_level,
        min_spending: tier.min_spending,
        max_spending: tier.max_spending,
        discount_percentage: tier.discount_percentage,
        free_shipping_threshold: tier.free_shipping_threshold,
        badge_color: tier.badge_color,
        badge_icon: tier.badge_icon,
      });
    } else if (!open) {
      reset({
        tier_name: '',
        tier_level: 1,
        min_spending: 0,
        max_spending: null,
        discount_percentage: 0,
        free_shipping_threshold: null,
        badge_color: 'accent',
        badge_icon: 'Medal',
      });
    }
  }, [tier, open, reset]);

  const onSubmit = async (data: TierFormData) => {
    try {
      // Ensure all required fields are present
      const tierData = {
        tier_name: data.tier_name,
        tier_level: data.tier_level,
        min_spending: data.min_spending,
        max_spending: data.max_spending,
        discount_percentage: data.discount_percentage,
        free_shipping_threshold: data.free_shipping_threshold,
        badge_color: data.badge_color,
        badge_icon: data.badge_icon,
      };

      if (isEdit) {
        const { error } = await supabase
          .from('member_tier_config')
          .update(tierData)
          .eq('id', tier.id);

        if (error) throw error;

        toast({
          title: 'Berhasil',
          description: 'Tier berhasil diupdate',
        });
      } else {
        const { error } = await supabase.from('member_tier_config').insert([tierData]);

        if (error) throw error;

        toast({
          title: 'Berhasil',
          description: 'Tier berhasil ditambahkan',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving tier:', error);
      toast({
        title: 'Error',
        description: error.message || 'Gagal menyimpan tier',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Tier' : 'Tambah Tier Baru'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tier_name">Nama Tier *</Label>
              <Input
                id="tier_name"
                placeholder="Bronze, Silver, Gold..."
                {...register('tier_name')}
              />
              {errors.tier_name && (
                <p className="text-sm text-destructive">{errors.tier_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier_level">Level *</Label>
              <Input
                id="tier_level"
                type="number"
                placeholder="1, 2, 3..."
                {...register('tier_level', { valueAsNumber: true })}
              />
              {errors.tier_level && (
                <p className="text-sm text-destructive">{errors.tier_level.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_spending">Minimal Spending (Rp) *</Label>
              <Input
                id="min_spending"
                type="number"
                placeholder="0"
                {...register('min_spending', { valueAsNumber: true })}
              />
              {errors.min_spending && (
                <p className="text-sm text-destructive">{errors.min_spending.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_spending">Maksimal Spending (Rp)</Label>
              <Input
                id="max_spending"
                type="number"
                placeholder="Kosongkan untuk unlimited"
                {...register('max_spending', {
                  setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
                })}
              />
              {errors.max_spending && (
                <p className="text-sm text-destructive">{errors.max_spending.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount_percentage">Diskon (%) *</Label>
              <Input
                id="discount_percentage"
                type="number"
                placeholder="0-100"
                {...register('discount_percentage', { valueAsNumber: true })}
              />
              {errors.discount_percentage && (
                <p className="text-sm text-destructive">{errors.discount_percentage.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="free_shipping_threshold">Free Shipping Threshold (Rp)</Label>
              <Input
                id="free_shipping_threshold"
                type="number"
                placeholder="Kosongkan jika tidak ada"
                {...register('free_shipping_threshold', {
                  setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
                })}
              />
              {errors.free_shipping_threshold && (
                <p className="text-sm text-destructive">
                  {errors.free_shipping_threshold.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="badge_icon">Icon Badge *</Label>
              <Select
                value={badgeIcon}
                onValueChange={(value) => setValue('badge_icon', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih icon" />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.badge_icon && (
                <p className="text-sm text-destructive">{errors.badge_icon.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge_color">Warna Badge *</Label>
              <Select
                value={badgeColor}
                onValueChange={(value) => setValue('badge_color', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih warna" />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.badge_color && (
                <p className="text-sm text-destructive">{errors.badge_color.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Update' : 'Tambah'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
