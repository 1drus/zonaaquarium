import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Award, Medal, Crown, Gem, TrendingUp, ShoppingBag, Sparkles, Gift, Copy, Check, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { TierVoucherInfo } from './TierVoucherInfo';
import confetti from 'canvas-confetti';

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

// Confetti configurations for each tier
const getTierConfetti = (tierName: string) => {
  const configs = {
    Bronze: {
      particleCount: 100,
      spread: 70,
      colors: ['#FF8A00', '#FFA500', '#FFB84D'],
      scalar: 1.2,
    },
    Silver: {
      particleCount: 150,
      spread: 80,
      colors: ['#C0C0C0', '#D3D3D3', '#E8E8E8'],
      scalar: 1.4,
    },
    Gold: {
      particleCount: 200,
      spread: 90,
      colors: ['#FFD700', '#FFC800', '#FFDB58'],
      scalar: 1.6,
    },
    Platinum: {
      particleCount: 300,
      spread: 120,
      colors: ['#0EA5E9', '#38BDF8', '#7DD3FC', '#E0F2FE'],
      scalar: 2,
      shapes: ['circle', 'square'] as confetti.Shape[],
    },
  };
  return configs[tierName as keyof typeof configs] || configs.Bronze;
};

// Trigger celebration confetti
const triggerTierCelebration = (tierName: string) => {
  const config = getTierConfetti(tierName);
  
  // Fire confetti from multiple angles
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { 
    startVelocity: 30, 
    spread: config.spread, 
    ticks: 60, 
    zIndex: 9999,
    ...config 
  };

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Fire from left
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });

    // Fire from right
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });

    // Fire from center
    confetti({
      ...defaults,
      particleCount: particleCount * 1.5,
      origin: { x: 0.5, y: 0.5 },
      spread: config.spread * 1.5,
    });
  }, 250);

  // Big burst at the end
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: config.particleCount * 2,
      origin: { x: 0.5, y: 0.5 },
      spread: 360,
      scalar: config.scalar * 1.5,
    });
  }, duration - 500);
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
  const hasShownCelebration = useRef(false);

  useEffect(() => {
    if (user) {
      loadMemberProgress();
      loadTierVouchers();

      // Subscribe to member progress changes for tier upgrades
      const progressChannel = supabase
        .channel('member-progress-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'member_progress',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Member progress updated:', payload);
            const newData = payload.new as MemberProgressData;
            const oldData = payload.old as MemberProgressData;

            // Check if tier changed
            if (newData.current_tier !== oldData.current_tier) {
              console.log('Tier upgraded!', oldData.current_tier, '->', newData.current_tier);
              
              // Trigger celebration
              triggerTierCelebration(newData.current_tier);
              
              // Show toast notification
              toast({
                title: '🎉 Selamat! Tier Naik!',
                description: `Anda telah naik ke tier ${newData.current_tier}!`,
                duration: 5000,
              });
            }

            loadMemberProgress();
          }
        )
        .subscribe();

      // Subscribe to new vouchers
      const voucherChannel = supabase
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
        supabase.removeChannel(progressChannel);
        supabase.removeChannel(voucherChannel);
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

      // Fallback to default tiers if no config found in DB
      const defaultTiers: TierConfig[] = [
        {
          tier_name: 'Bronze',
          tier_level: 1,
          min_spending: 0,
          max_spending: 1000000,
          discount_percentage: 0,
          free_shipping_threshold: null,
          badge_color: 'accent',
          badge_icon: 'Medal',
        },
        {
          tier_name: 'Silver',
          tier_level: 2,
          min_spending: 1000000,
          max_spending: 5000000,
          discount_percentage: 2,
          free_shipping_threshold: null,
          badge_color: 'muted',
          badge_icon: 'Award',
        },
        {
          tier_name: 'Gold',
          tier_level: 3,
          min_spending: 5000000,
          max_spending: 10000000,
          discount_percentage: 5,
          free_shipping_threshold: null,
          badge_color: 'accent-light',
          badge_icon: 'Crown',
        },
        {
          tier_name: 'Platinum',
          tier_level: 4,
          min_spending: 10000000,
          max_spending: null,
          discount_percentage: 10,
          free_shipping_threshold: null,
          badge_color: 'primary',
          badge_icon: 'Gem',
        },
      ];

      const tierList: TierConfig[] = (tierData && tierData.length > 0) ? tierData : defaultTiers;
      setTiers(tierList);

      // Load user progress
      const { data: progressData, error: progressError } = await supabase
        .from('member_progress')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError;
      }

      const newProgress = progressData || {
        current_tier: 'Bronze',
        total_spending: 0,
        order_count: 0,
        tier_upgraded_at: null,
      };

      // Check if tier upgrade just happened (within last 10 seconds)
      if (
        newProgress.tier_upgraded_at && 
        !hasShownCelebration.current &&
        !loading
      ) {
        const upgradeTime = new Date(newProgress.tier_upgraded_at).getTime();
        const now = Date.now();
        const tenSecondsAgo = now - 10000;

        if (upgradeTime > tenSecondsAgo) {
          console.log('Recent tier upgrade detected, triggering celebration!');
          hasShownCelebration.current = true;
          
          // Small delay to ensure UI is ready
          setTimeout(() => {
            triggerTierCelebration(newProgress.current_tier);
            toast({
              title: '🎉 Selamat! Tier Naik!',
              description: `Anda telah naik ke tier ${newProgress.current_tier}!`,
              duration: 5000,
            });
          }, 500);
        }
      }

      setProgress(newProgress);

      // Find current and next tier configs
      if (tierList && tierList.length > 0 && newProgress) {
        const current = tierList.find(t => t.tier_name === newProgress.current_tier);
        setCurrentTierConfig(current || tierList[0]);

        const currentLevel = (current?.tier_level || tierList[0].tier_level);
        const next = tierList.find(t => t.tier_level === currentLevel + 1);
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

      // Check for unnotified vouchers and show them
      if (data && data.length > 0) {
        const unnotifiedVouchers = data.filter(v => !v.is_notified);
        
        for (const voucher of unnotifiedVouchers) {
          await showVoucherNotification(voucher);
          
          // Mark as notified
          await supabase
            .from('user_tier_vouchers')
            .update({ is_notified: true })
            .eq('id', voucher.id);
        }
      }
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
    
    // Handle edge case where current spending is less than current tier min
    if (current < min) return 0;
    
    // Handle edge case where current spending exceeds next tier min
    if (current >= max) return 100;
    
    // Calculate progress within current tier range
    return Math.max(0, Math.min(((current - min) / (max - min)) * 100, 100));
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
    ? Math.max(0, nextTierConfig.min_spending - progress.total_spending)
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

        {/* Tier Journey Roadmap */}
        <div className="space-y-6 p-5 rounded-xl bg-gradient-to-br from-primary/5 via-accent/5 to-background border border-primary/10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary animate-pulse" />
            <h4 className="font-semibold text-lg">Perjalanan Member Anda</h4>
          </div>

          {/* Tier Steps Visualization */}
          <div className="relative">
            {/* Progress line */}
            <div className="absolute top-8 left-0 w-full h-1 bg-muted/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary via-accent to-primary-light transition-all duration-1000 ease-out animate-fade-in"
                style={{ 
                  width: `${((currentTierConfig.tier_level - 1) / 3 * 100) + (progressPercentage / 3)}%` 
                }}
              />
            </div>

            {/* Tier steps */}
            <div className="relative grid grid-cols-4 gap-2">
              {tiers.map((tier) => {
                const isCompleted = tier.tier_level < currentTierConfig.tier_level;
                const isCurrent = tier.tier_level === currentTierConfig.tier_level;
                const isNext = tier.tier_level === currentTierConfig.tier_level + 1;
                const tierColors = getTierColors(tier.tier_name);

                return (
                  <div
                    key={tier.tier_name}
                    className={`flex flex-col items-center gap-2 transition-all duration-500 ${
                      isCurrent ? 'scale-110 animate-scale-in' : 'hover:scale-105'
                    }`}
                  >
                    {/* Step circle */}
                    <div className="relative group cursor-pointer">
                      {/* Glow effect for current tier */}
                      {isCurrent && (
                        <>
                          <div className={`absolute -inset-2 rounded-full ${tierColors.ring} ring-2 animate-pulse blur-sm ${tierColors.glow}`} />
                          <div className={`absolute -inset-1 rounded-full ${tierColors.ring} ring-4 opacity-20 animate-ping`} />
                        </>
                      )}
                      
                      {/* Step indicator */}
                      <div
                        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
                          isCompleted
                            ? `${tierColors.badge} shadow-lg ${tierColors.glow}`
                            : isCurrent
                            ? `${tierColors.badge} shadow-xl ${tierColors.glow} ring-4 ${tierColors.ring}`
                            : 'bg-muted/50 border-2 border-muted-foreground/20'
                        } ${isCurrent ? 'animate-bounce' : ''}`}
                      >
                        {/* Shine effect */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Icon */}
                        {getTierIcon(
                          tier.badge_icon,
                          `h-8 w-8 relative z-10 ${
                            isCompleted || isCurrent
                              ? 'text-current'
                              : 'text-muted-foreground/40'
                          }`
                        )}

                        {/* Checkmark for completed */}
                        {isCompleted && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center animate-scale-in">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Tooltip on hover */}
                      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <div className="bg-popover text-popover-foreground px-3 py-2 rounded-lg shadow-xl border text-xs whitespace-nowrap">
                          <p className="font-semibold">{tier.tier_name}</p>
                          <p className="text-muted-foreground">Min: {formatCurrency(tier.min_spending)}</p>
                          {tier.discount_percentage > 0 && (
                            <p className="text-primary">Diskon {tier.discount_percentage}%</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tier name */}
                    <div className="text-center">
                      <p className={`text-xs font-medium transition-colors ${
                        isCurrent 
                          ? 'text-foreground font-bold' 
                          : isCompleted 
                          ? 'text-muted-foreground' 
                          : 'text-muted-foreground/60'
                      }`}>
                        {tier.tier_name}
                      </p>
                      {isCurrent && (
                        <Badge variant="secondary" className="text-[10px] mt-1 animate-fade-in">
                          Saat ini
                        </Badge>
                      )}
                      {isNext && (
                        <Badge variant="outline" className="text-[10px] mt-1 animate-fade-in">
                          Selanjutnya
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress to Next Tier Details */}
          {nextTierConfig && (
            <div className="space-y-3 mt-6 p-4 rounded-xl bg-gradient-to-br from-accent/10 via-primary/5 to-background border border-primary/20 animate-fade-in">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Target: {nextTierConfig.tier_name}</span>
                </div>
                <Badge className="text-xs font-bold bg-gradient-to-r from-primary to-accent">
                  {progressPercentage.toFixed(0)}%
                </Badge>
              </div>
              
              {/* Enhanced Progress Bar */}
              <div className="relative group">
                <Progress 
                  value={progressPercentage} 
                  className="h-5 bg-muted/50 border border-border/30 shadow-inner overflow-hidden"
                />
                
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                
                {/* Progress percentage text inside bar */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold mix-blend-difference text-white drop-shadow-lg">
                    {progressPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              {/* Spending details */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="space-y-1 p-2 rounded-lg bg-background/50">
                  <p className="text-muted-foreground">Sudah Belanja</p>
                  <p className="font-bold text-primary">{formatCurrency(progress.total_spending)}</p>
                </div>
                <div className="space-y-1 p-2 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-muted-foreground">Kurang</p>
                  <p className="font-bold text-accent">{formatCurrency(remainingToNext)}</p>
                </div>
                <div className="space-y-1 p-2 rounded-lg bg-background/50">
                  <p className="text-muted-foreground">Target</p>
                  <p className="font-bold">{formatCurrency(nextTierConfig.min_spending)}</p>
                </div>
              </div>

              {/* Motivational message */}
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 animate-fade-in">
                <Gift className="h-4 w-4 text-primary animate-bounce" />
                <p className="text-xs text-muted-foreground">
                  Belanja <span className="font-bold text-foreground">{formatCurrency(remainingToNext)}</span> lagi untuk unlock benefit {nextTierConfig.tier_name}!
                </p>
              </div>
            </div>
          )}

          {/* Max tier reached */}
          {currentTierConfig.tier_level === 4 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary-light/20 border border-primary/30 animate-fade-in">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-accent animate-bounce" />
                <div>
                  <p className="font-bold text-foreground">Selamat! 🎉</p>
                  <p className="text-sm text-muted-foreground">
                    Anda telah mencapai tier tertinggi!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

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
            <li className="flex items-center gap-3 p-2 rounded-lg bg-background/50 hover:bg-background/80 transition-colors">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              </div>
              <span><strong className="text-primary">Voucher eksklusif otomatis</strong> saat naik tier</span>
            </li>
          </ul>
        </div>

        {/* Tier Voucher Info */}
        {currentTierConfig.tier_level >= 2 && <TierVoucherInfo />}

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