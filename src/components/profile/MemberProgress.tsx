import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Award, Medal, Crown, Gem, TrendingUp, ShoppingBag, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

const getTierGradient = (tierName: string) => {
  const gradients = {
    Bronze: 'from-amber-700 via-amber-600 to-amber-800',
    Silver: 'from-gray-400 via-gray-300 to-gray-500',
    Gold: 'from-yellow-400 via-yellow-300 to-yellow-500',
    Platinum: 'from-slate-300 via-slate-200 to-slate-400',
  };
  return gradients[tierName as keyof typeof gradients] || gradients.Bronze;
};

export const MemberProgress = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<MemberProgressData | null>(null);
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [currentTierConfig, setCurrentTierConfig] = useState<TierConfig | null>(null);
  const [nextTierConfig, setNextTierConfig] = useState<TierConfig | null>(null);

  useEffect(() => {
    if (user) {
      loadMemberProgress();
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
    <Card className="overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className={`absolute inset-0 bg-gradient-to-br ${getTierGradient(progress.current_tier)}`} />
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
        <div className="flex items-center justify-center">
          <div className={`relative p-8 rounded-full bg-gradient-to-br ${getTierGradient(progress.current_tier)} shadow-xl animate-scale-in`}>
            <div className="absolute inset-0 rounded-full animate-pulse opacity-50 bg-gradient-to-br from-white/30 to-transparent" />
            {getTierIcon(currentTierConfig.badge_icon, 'h-16 w-16 text-white relative z-10')}
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
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress ke {nextTierConfig.tier_name}</span>
              <span className="font-medium">{progressPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <p className="text-xs text-center text-muted-foreground">
              Belanja lagi {formatCurrency(remainingToNext)} untuk mencapai {nextTierConfig.tier_name}
            </p>
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
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Total Belanja</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(progress.total_spending)}</p>
          </div>
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <ShoppingBag className="h-4 w-4" />
              <span className="text-xs">Total Pesanan</span>
            </div>
            <p className="text-lg font-bold">{progress.order_count}</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-2 pt-4 border-t">
          <h4 className="font-semibold text-sm">Benefit {progress.current_tier}:</h4>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {currentTierConfig.discount_percentage > 0 && (
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Diskon {currentTierConfig.discount_percentage}% semua produk
              </li>
            )}
            {currentTierConfig.free_shipping_threshold !== null && (
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {currentTierConfig.free_shipping_threshold === 0 
                  ? 'Gratis ongkir untuk semua pesanan'
                  : `Gratis ongkir min. ${formatCurrency(currentTierConfig.free_shipping_threshold)}`
                }
              </li>
            )}
            {currentTierConfig.tier_level >= 3 && (
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Priority customer support
              </li>
            )}
            {currentTierConfig.tier_level === 4 && (
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Early access ke produk baru
              </li>
            )}
          </ul>
        </div>

        {/* All Tiers Overview */}
        <div className="space-y-2 pt-4 border-t">
          <h4 className="font-semibold text-sm">Semua Tier:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {tiers.map((tier) => (
              <div
                key={tier.tier_name}
                className={`p-3 rounded-lg border-2 transition-all ${
                  tier.tier_name === progress.current_tier
                    ? 'border-primary bg-primary/5 scale-105'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getTierIcon(tier.badge_icon, 'h-4 w-4')}
                  <span className="font-medium text-xs">{tier.tier_name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tier.max_spending 
                    ? `${formatCurrency(tier.min_spending).slice(0, -3)}K+`
                    : `${formatCurrency(tier.min_spending).slice(0, -3)}K+`
                  }
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};