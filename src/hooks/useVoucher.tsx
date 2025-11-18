import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Voucher {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_purchase: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number | null;
  user_usage_limit: number | null;
  valid_from: string;
  valid_until: string;
  is_active: boolean | null;
  allowed_tiers: string[] | null;
}

export function useVoucher() {
  const { user } = useAuth();
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateVoucher = async (code: string, subtotal: number): Promise<Voucher | null> => {
    if (!code.trim()) {
      toast.error('Masukkan kode voucher');
      return null;
    }

    setIsValidating(true);
    try {
      // Fetch voucher by code
      const { data: voucher, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (error || !voucher) {
        toast.error('Voucher tidak ditemukan');
        return null;
      }

      // Check if voucher is active
      if (!voucher.is_active) {
        toast.error('Voucher tidak aktif');
        return null;
      }

      // Check valid date range
      const now = new Date();
      const validFrom = new Date(voucher.valid_from);
      const validUntil = new Date(voucher.valid_until);

      if (now < validFrom) {
        toast.error('Voucher belum dapat digunakan');
        return null;
      }

      if (now > validUntil) {
        toast.error('Voucher sudah kadaluarsa');
        return null;
      }

      // Check minimum purchase
      if (voucher.min_purchase && subtotal < voucher.min_purchase) {
        toast.error(
          `Minimum pembelian Rp ${voucher.min_purchase.toLocaleString('id-ID')}`
        );
        return null;
      }

      // Check usage limit
      if (voucher.usage_limit && voucher.usage_count && voucher.usage_count >= voucher.usage_limit) {
        toast.error('Voucher sudah mencapai batas penggunaan');
        return null;
      }

      // Check user usage limit
      if (user && voucher.user_usage_limit) {
        const { count } = await supabase
          .from('voucher_usage')
          .select('*', { count: 'exact', head: true })
          .eq('voucher_id', voucher.id)
          .eq('user_id', user.id);

        if (count && count >= voucher.user_usage_limit) {
          toast.error('Anda sudah mencapai batas penggunaan voucher ini');
          return null;
        }
      }

      // Check tier restriction
      if (user && voucher.allowed_tiers && voucher.allowed_tiers.length > 0) {
        const { data: memberProgress } = await supabase
          .from('member_progress')
          .select('current_tier')
          .eq('user_id', user.id)
          .single();

        if (!memberProgress) {
          toast.error('Data member tidak ditemukan');
          return null;
        }

        if (!voucher.allowed_tiers.includes(memberProgress.current_tier)) {
          toast.error(`Voucher ini hanya untuk tier: ${voucher.allowed_tiers.join(', ')}`);
          return null;
        }
      }

      toast.success('Voucher berhasil diterapkan!');
      return voucher;
    } catch (error) {
      console.error('Error validating voucher:', error);
      toast.error('Gagal memvalidasi voucher');
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  const calculateDiscount = (voucher: Voucher | null, subtotal: number): number => {
    if (!voucher) return 0;

    let discount = 0;

    if (voucher.discount_type === 'percentage') {
      discount = (subtotal * voucher.discount_value) / 100;
      
      // Apply max discount if set
      if (voucher.max_discount && discount > voucher.max_discount) {
        discount = voucher.max_discount;
      }
    } else if (voucher.discount_type === 'fixed') {
      discount = voucher.discount_value;
    }

    // Discount cannot exceed subtotal
    return Math.min(discount, subtotal);
  };

  const applyVoucher = async (code: string, subtotal: number) => {
    const voucher = await validateVoucher(code, subtotal);
    if (voucher) {
      setAppliedVoucher(voucher);
    }
    return voucher;
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    toast.info('Voucher dihapus');
  };

  return {
    appliedVoucher,
    isValidating,
    applyVoucher,
    removeVoucher,
    calculateDiscount,
  };
}
