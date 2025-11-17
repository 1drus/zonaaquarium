import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Award, Medal, Crown, Gem, TrendingUp, ShoppingBag, Sparkles, Gift, Copy, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface TierConfig {
  tier_name: string;
  tier_level: number;
  min_spending: number;
  max_spending: number | null;
  discount_percentage: number;
  free_shipping_threshold: number | null;
  badge_color: string;
  badge_icon: string;
}

interface MemberProgressData {
  current_tier: string;
  total_spending: number;
  order_count: number;
  tier_upgraded_at: string | null;
}

interface TierVoucher {
  id: string;
  voucher_id: string;
  tier_name: string;
  assigned_at: string;
  is_notified: boolean;
  vouchers: {
    code: string;
    description: string;
    discount_type: string;
    discount_value: number;
    min_purchase: number;
    max_discount: number | null;
    valid_until: string;
    usage_count: number;
    usage_limit: number;
  };
}

const getTierIcon = (iconName: string, className: string) => {
  const icons = {
    Award: Award,
    Medal: Medal,
    Crown: Crown,
    Gem: Gem,
  };
  const Icon = icons[iconName as keyof typeof icons] || Award;
  return <Icon className={className} />;
};

const getTierColors = (tierName: string) => {
  const colors = {
    Bronze: {
      bg: 'bg-gradient-to-br from-accent/10 via-accent/5 to-background',
      border: 'border-accent/20',
      ring: 'ring-accent/30',
      badge: 'bg-accent text-accent-foreground',
      glow: 'shadow-[0_0_20px_rgba(255,138,0,0.3)]'
    },
    Silver: {
      bg: 'bg-gradient-to-br from-muted via-muted/50 to-background',
      border: 'border-muted-foreground/20',
      ring: 'ring-muted-foreground/30',
      badge: 'bg-muted text-muted-foreground',
      glow: 'shadow-[0_0_20px_rgba(148,163,184,0.3)]'
    },
    Gold: {
      bg: 'bg-gradient-to-br from-accent-light/10 via-accent/5 to-background',
      border: 'border-accent-light/20',
      ring: 'ring-accent-light/30',
      badge: 'bg-gradient-to-r from-accent via-accent-light to-accent text-accent-foreground',
      glow: 'shadow-[0_0_20px_rgba(255,200,0,0.4)]'
    },
    Platinum: {
      bg: 'bg-gradient-to-br from-primary-light/10 via-primary/5 to-background',
      border: 'border-primary/20',
      ring: 'ring-primary/30',
      badge: 'bg-gradient-to-r from-primary via-primary-light to-primary text-primary-foreground',
      glow: 'shadow-[0_0_25px_rgba(14,165,233,0.5)]'
    },
  };
  return colors[tierName as keyof typeof colors] || colors.Bronze;
};

export const MemberProgress = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<MemberProgressData | null>(null);
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [currentTierConfig, setCurrentTierConfig] = useState<TierConfig | null>(null);
  const [nextTierConfig, setNextTierConfig] = useState<TierConfig | null>(null);
  const [tierVouchers, setTierVouchers] = useState<TierVoucher[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadMemberProgress();
      loadTierVouchers();

      // Subscribe to new vouchers
      const channel = supabase
        .channel('tier-vouchers-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_tier_vouchers',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('New tier voucher received:', payload);
            loadTierVouchers();
            showVoucherNotification(payload.new as TierVoucher);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadMemberProgress = async () => {
    try {
      // Load tier configurations
      const { data: tierData, error: tierError } = await supabase
        .from('member_tier_config')
        .select('*')
        .order('tier_level');

      if (tierError) throw tierError;
      setTiers(tierData || []);

      // Load user progress
      const { data: progressData, error: progressError } = await supabase
        .from('member_progress')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError;
      }

      setProgress(progressData || {
        current_tier: 'Bronze',
        total_spending: 0,
        order_count: 0,
        tier_upgraded_at: null,
      });

      // Find current and next tier configs
      if (tierData && progressData) {
        const current = tierData.find(t => t.tier_name === progressData.current_tier);
        setCurrentTierConfig(current || tierData[0]);

        const currentLevel = current?.tier_level || 1;
        const next = tierData.find(t => t.tier_level === currentLevel + 1);
        setNextTierConfig(next || null);
      }
    } catch (error) {
      console.error('Error loading member progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTierVouchers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_tier_vouchers')
        .select(`
          *,
          vouchers (
            code,
            description,
            discount_type,
            discount_value,
            min_purchase,
            max_discount,
            valid_until,
            usage_count,
            usage_limit
          )
        `)
        .eq('user_id', user?.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setTierVouchers(data || []);
    } catch (error) {
      console.error('Error loading tier vouchers:', error);
    }
  };

  const showVoucherNotification = async (newVoucher: TierVoucher) => {
    // Fetch voucher details
    const { data: voucherData } = await supabase
      .from('vouchers')
      .select('code, description')
      .eq('id', newVoucher.voucher_id)
      .single();

    if (voucherData) {
      toast({
        title: '🎉 Voucher Eksklusif Diterima!',
        description: `Selamat! Anda mendapat voucher ${newVoucher.tier_name}: ${voucherData.code}`,
        duration: 8000,
      });
    }
  };

  const copyVoucherCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: 'Kode Disalin!',
        description: `Kode voucher ${code} telah disalin`,
        duration: 2000,
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error('Error copying code:', error);
    }
  };

  const calculateProgress = () => {
    if (!progress || !currentTierConfig || !nextTierConfig) return 100;
    
    const current = progress.total_spending;
    const min = currentTierConfig.min_spending;
    const max = nextTierConfig.min_spending;
    
    return Math.min(((current - min) / (max - min)) * 100, 100);
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
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!progress || !currentTierConfig) return null;

  const progressPercentage = calculateProgress();
  const remainingToNext = nextTierConfig 
    ? nextTierConfig.min_spending - progress.total_spending 
    : 0;

  return (
    <Card className="overflow-hidden relative border-2 hover:border-primary/30 transition-all duration-500">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className={`absolute inset-0 ${getTierColors(progress.current_tier).bg}`} />
      </div>

      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Member Progress
          </CardTitle>
          {progress.tier_upgraded_at && (
            <Badge variant="secondary" className="text-xs">
              Upgrade: {new Date(progress.tier_upgraded_at).toLocaleDateString('id-ID')}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 relative">
        {/* Current Tier Badge */}
        <div className="flex items-center justify-center py-8">
          <div className="relative group">
            {/* Animated glow rings */}
            <div className={`absolute -inset-4 rounded-full ${getTierColors(progress.current_tier).ring} ring-4 animate-pulse blur-md ${getTierColors(progress.current_tier).glow}`} />
            <div className={`absolute -inset-3 rounded-full ${getTierColors(progress.current_tier).ring} ring-8 opacity-30 animate-ping`} />
            
            {/* Main badge with 3D effect */}
            <div className={`relative ${getTierColors(progress.current_tier).badge} p-10 rounded-full shadow-2xl transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-6`}>
              {/* Shine effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/40 via-white/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
              
              {/* Inner shadow for depth */}
              <div className="absolute inset-2 rounded-full shadow-inner bg-black/5" />
              
              {/* Animated sparkles */}
              <Sparkles className="absolute -top-3 -right-3 h-7 w-7 animate-pulse" />
              <Sparkles className="absolute -bottom-3 -left-3 h-5 w-5 animate-pulse delay-100" />
              
              {/* Icon */}
              {getTierIcon(currentTierConfig.badge_icon, 'h-20 w-20 relative z-10 drop-shadow-2xl animate-bounce')}
            </div>
          </div>
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-2xl font-bold">{progress.current_tier} Member</h3>
          <p className="text-sm text-muted-foreground">
            {currentTierConfig.discount_percentage > 0 
              ? `Diskon ${currentTierConfig.discount_percentage}% untuk semua produk`
              : 'Mulai berbelanja untuk upgrade tier!'}
          </p>
        </div>

        {/* Progress to Next Tier */}
        {nextTierConfig && (
          <div className="space-y-3 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/50">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium">Progress ke {nextTierConfig.tier_name}</span>
              </div>
              <Badge variant="secondary" className="text-xs font-bold">
                {progressPercentage.toFixed(0)}%
              </Badge>
            </div>
            
            {/* Enhanced Progress Bar with gradient */}
            <div className="relative">
              <Progress 
                value={progressPercentage} 
                className="h-4 bg-muted/50 border border-border/30 shadow-inner"
              />
              
              {/* Milestone markers */}
              <div className="absolute inset-0 flex items-center justify-between px-1">
                {[25, 50, 75].map((milestone) => (
                  <div
                    key={milestone}
                    className={`h-6 w-0.5 rounded-full transition-colors ${
                      progressPercentage >= milestone 
                        ? 'bg-primary-foreground/60' 
                        : 'bg-muted-foreground/20'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Belanja lagi</span>
              <span className="font-bold text-primary">{formatCurrency(remainingToNext)}</span>
              <span className="text-muted-foreground">untuk mencapai {nextTierConfig.tier_name}</span>
            </div>
          </div>
        )}

        {currentTierConfig.tier_level === 4 && (
          <div className="text-center p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
            <p className="text-sm font-medium text-primary">
              🎉 Selamat! Anda telah mencapai tier tertinggi!
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative group p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <TrendingUp className="h-3 w-3 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-medium">Total Belanja</span>
              </div>
              <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {formatCurrency(progress.total_spending)}
              </p>
            </div>
          </div>
          
          <div className="relative group p-4 rounded-xl bg-gradient-to-br from-secondary/10 via-secondary/5 to-transparent border border-secondary/20 hover:border-secondary/40 transition-all hover:shadow-lg">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ShoppingBag className="h-3 w-3 text-foreground" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="p-1.5 rounded-lg bg-secondary/10">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium">Total Pesanan</span>
              </div>
              <p className="text-2xl font-bold">{progress.order_count}</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-3 p-6 rounded-2xl bg-gradient-to-br from-accent/10 via-accent/5 to-background border-2 border-accent/20 hover:border-accent/40 transition-all duration-500 shadow-lg hover:shadow-xl">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${getTierColors(progress.current_tier).badge} shadow-md`}>
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-base bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Benefit {progress.current_tier}</h4>
          </div>
          <ul className="space-y-2 text-sm">
            {currentTierConfig.discount_percentage > 0 && (
              <li className="flex items-center gap-3 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
                <span>Diskon <strong className="text-primary">{currentTierConfig.discount_percentage}%</strong> semua produk</span>
              </li>
            )}
            {currentTierConfig.free_shipping_threshold !== null && (
              <li className="flex items-center gap-3 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
                <span>
                  {currentTierConfig.free_shipping_threshold === 0 
                    ? <><strong className="text-primary">Gratis ongkir</strong> untuk semua pesanan</>
                    : <><strong className="text-primary">Gratis ongkir</strong> min. {formatCurrency(currentTierConfig.free_shipping_threshold)}</>
                  }
                </span>
              </li>
            )}
            {currentTierConfig.tier_level >= 3 && (
              <li className="flex items-center gap-3 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
                <span><strong className="text-primary">Priority</strong> customer support</span>
              </li>
            )}
            {currentTierConfig.tier_level === 4 && (
              <li className="flex items-center gap-3 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
                <span><strong className="text-primary">Early access</strong> ke produk baru</span>
              </li>
            )}
          </ul>
        </div>

        {/* Tier Exclusive Vouchers */}
        {tierVouchers.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Voucher Eksklusif Anda:</h4>
              </div>
              <div className="space-y-2">
                {tierVouchers.map((tierVoucher) => {
                  const isExpired = new Date(tierVoucher.vouchers.valid_until) < new Date();
                  const isUsed = tierVoucher.vouchers.usage_count >= tierVoucher.vouchers.usage_limit;
                  
                  return (
                    <div
                      key={tierVoucher.id}
                      className={`p-3 rounded-lg border-2 ${
                        isExpired || isUsed
                          ? 'border-muted bg-muted/20 opacity-60'
                          : 'border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {tierVoucher.tier_name}
                            </Badge>
                            {isUsed && (
                              <Badge variant="outline" className="text-xs">
                                Sudah Digunakan
                              </Badge>
                            )}
                            {isExpired && !isUsed && (
                              <Badge variant="destructive" className="text-xs">
                                Expired
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {tierVoucher.vouchers.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono font-bold bg-background px-2 py-1 rounded">
                              {tierVoucher.vouchers.code}
                            </code>
                            {!isExpired && !isUsed && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => copyVoucherCode(tierVoucher.vouchers.code)}
                              >
                                {copiedCode === tierVoucher.vouchers.code ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Valid sampai: {new Date(tierVoucher.vouchers.valid_until).toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* All Tiers Overview */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Medal className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold text-sm">Semua Tier</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tiers.map((tier) => {
              const isCurrentTier = tier.tier_name === progress.current_tier;
              const isAchieved = tier.tier_level <= currentTierConfig.tier_level;
              
              return (
                <div
                  key={tier.tier_name}
                  className={`group relative p-5 rounded-2xl border-2 transition-all duration-500 hover:scale-105 hover:-translate-y-1 ${
                    isCurrentTier
                      ? `${getTierColors(tier.tier_name).border} ${getTierColors(tier.tier_name).bg} shadow-xl ring-2 ${getTierColors(tier.tier_name).ring} ${getTierColors(tier.tier_name).glow}`
                      : isAchieved
                      ? 'border-primary/30 bg-primary/5 hover:border-primary/50 hover:shadow-lg'
                      : 'border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40'
                  }`}
                >
                  {/* Achievement badge for unlocked tiers */}
                  {isAchieved && !isCurrentTier && (
                    <div className="absolute -top-2 -right-2 p-1 rounded-full bg-primary">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  
                  {/* Current tier indicator */}
                  {isCurrentTier && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                      <Badge className="text-xs px-2 py-0.5 bg-primary">Anda disini</Badge>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${getTierColors(tier.tier_name).badge} shadow-md transform transition-transform group-hover:scale-110 ${isAchieved ? 'opacity-100' : 'opacity-40'}`}>
                        {getTierIcon(tier.badge_icon, 'h-6 w-6')}
                      </div>
                      <span className={`font-bold text-base ${isCurrentTier ? 'bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent' : isAchieved ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {tier.tier_name}
                      </span>
                    </div>
                    
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Min. Belanja
                      </p>
                      <p className={`text-sm font-bold ${isCurrentTier ? 'text-primary' : ''}`}>
                        {formatCurrency(tier.min_spending)}
                      </p>
                    </div>
                    
                    {tier.discount_percentage > 0 && (
                      <Badge variant="secondary" className="text-xs w-full justify-center">
                        {tier.discount_percentage}% OFF
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};