import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Award, Medal, Crown, Gem } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MemberProgressData {
  current_tier: string;
  total_spending: number;
}

const getTierIcon = (tierName: string) => {
  const icons = {
    Bronze: Award,
    Silver: Medal,
    Gold: Crown,
    Platinum: Gem,
  };
  return icons[tierName as keyof typeof icons] || Award;
};

const getTierColor = (tierName: string) => {
  const colors = {
    Bronze: 'text-amber-700',
    Silver: 'text-gray-400',
    Gold: 'text-yellow-500',
    Platinum: 'text-slate-400',
  };
  return colors[tierName as keyof typeof colors] || colors.Bronze;
};

export const MemberBadge = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState<MemberProgressData | null>(null);

  useEffect(() => {
    if (user) {
      loadMemberProgress();

      // Subscribe to changes
      const channel = supabase
        .channel('member-progress-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'member_progress',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadMemberProgress();
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
      const { data, error } = await supabase
        .from('member_progress')
        .select('current_tier, total_spending')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setProgress(data);
    } catch (error) {
      console.error('Error loading member badge:', error);
    }
  };

  if (!progress) return null;

  const Icon = getTierIcon(progress.current_tier);
  const colorClass = getTierColor(progress.current_tier);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/50 border border-border hover:bg-accent transition-colors cursor-pointer">
            <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
            <span className="text-xs font-medium">{progress.current_tier}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Total Belanja: {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
            }).format(progress.total_spending)}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};