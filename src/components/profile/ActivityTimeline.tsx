import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShoppingBag, 
  TrendingUp, 
  Gift, 
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface TimelineEvent {
  id: string;
  type: 'order' | 'tier_upgrade' | 'voucher';
  title: string;
  description: string;
  date: string;
  icon: any;
  iconColor: string;
  bgColor: string;
  status?: string;
  amount?: number;
}

export const ActivityTimeline = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (user) {
      loadActivityTimeline();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    if (!user) return;

    // Subscribe to new orders
    const ordersChannel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadActivityTimeline();
        }
      )
      .subscribe();

    // Subscribe to member progress changes (tier upgrades)
    const memberChannel = supabase
      .channel('member-progress-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'member_progress',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadActivityTimeline();
        }
      )
      .subscribe();

    // Subscribe to voucher usage
    const voucherChannel = supabase
      .channel('voucher-usage-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voucher_usage',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadActivityTimeline();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(memberChannel);
      supabase.removeChannel(voucherChannel);
    };
  };

  const loadActivityTimeline = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const allEvents: TimelineEvent[] = [];

      // Load recent orders (last 10)
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (orders) {
        orders.forEach(order => {
          const statusConfig = getOrderStatusConfig(order.status);
          allEvents.push({
            id: `order-${order.id}`,
            type: 'order',
            title: `Pesanan ${order.order_number}`,
            description: `Rp ${order.total_amount.toLocaleString('id-ID')} - ${statusConfig.label}`,
            date: order.created_at,
            icon: statusConfig.icon,
            iconColor: statusConfig.color,
            bgColor: statusConfig.bgColor,
            status: order.status,
            amount: order.total_amount,
          });
        });
      }

      // Load tier upgrade history
      const { data: memberProgress } = await supabase
        .from('member_progress')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (memberProgress && memberProgress.tier_upgraded_at) {
        allEvents.push({
          id: `tier-${memberProgress.tier_upgraded_at}`,
          type: 'tier_upgrade',
          title: `Naik ke Tier ${memberProgress.current_tier}!`,
          description: `Selamat! Anda telah mencapai tier ${memberProgress.current_tier}`,
          date: memberProgress.tier_upgraded_at,
          icon: TrendingUp,
          iconColor: 'text-primary',
          bgColor: 'bg-primary/10',
        });
      }

      // Load voucher redemptions (last 5)
      const { data: voucherUsage } = await supabase
        .from('voucher_usage')
        .select(`
          *,
          vouchers:voucher_id (code, description)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (voucherUsage) {
        voucherUsage.forEach(usage => {
          allEvents.push({
            id: `voucher-${usage.id}`,
            type: 'voucher',
            title: 'Voucher Digunakan',
            description: `${usage.vouchers?.code} - Hemat Rp ${usage.discount_amount.toLocaleString('id-ID')}`,
            date: usage.created_at,
            icon: Gift,
            iconColor: 'text-accent',
            bgColor: 'bg-accent/10',
          });
        });
      }

      // Sort all events by date (newest first)
      allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setEvents(allEvents.slice(0, 15)); // Show last 15 events
    } catch (error) {
      console.error('Error loading activity timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatusConfig = (status: string) => {
    const configs = {
      menunggu_pembayaran: {
        label: 'Menunggu Pembayaran',
        icon: Clock,
        color: 'text-accent',
        bgColor: 'bg-accent/10',
      },
      diproses: {
        label: 'Diproses',
        icon: Package,
        color: 'text-secondary',
        bgColor: 'bg-secondary/10',
      },
      dikirim: {
        label: 'Dikirim',
        icon: ShoppingBag,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
      },
      selesai: {
        label: 'Selesai',
        icon: CheckCircle2,
        color: 'text-secondary',
        bgColor: 'bg-secondary/10',
      },
      dibatalkan: {
        label: 'Dibatalkan',
        icon: XCircle,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
      },
    };
    return configs[status as keyof typeof configs] || configs.menunggu_pembayaran;
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMMM yyyy, HH:mm', { locale: id });
  };

  const getRelativeTime = (date: string) => {
    const now = new Date();
    const eventDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60));
      return `${diffInMinutes} menit yang lalu`;
    }
    if (diffInHours < 24) {
      return `${diffInHours} jam yang lalu`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} hari yang lalu`;
    }
    return formatDate(date);
  };

  if (loading) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Aktivitas Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Aktivitas Terbaru
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/30 mb-4">
              <Sparkles className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Belum ada aktivitas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Mulai berbelanja untuk melihat riwayat aktivitas Anda
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 hover:border-primary/30 transition-all duration-500">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary animate-pulse" />
            <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              Aktivitas Terbaru
            </span>
          </span>
          <Badge variant="secondary" className="px-3 py-1">
            {events.length} Aktivitas
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="relative space-y-6">
          {/* Timeline Line */}
          <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-gradient-to-b from-primary/50 via-secondary/30 to-transparent" />

          {events.map((event, index) => {
            const Icon = event.icon;
            const isLast = index === events.length - 1;

            return (
              <div
                key={event.id}
                className={`relative pl-16 group animate-fade-in`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Icon */}
                <div
                  className={`absolute left-0 ${event.bgColor} ${event.iconColor} p-3 rounded-full border-2 border-background shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div
                  className={`p-4 rounded-xl border-2 border-border/50 bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300 ${
                    !isLast ? 'mb-6' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {event.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.description}
                      </p>
                    </div>
                    {event.type === 'tier_upgrade' && (
                      <Badge className="bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg">
                        <Award className="h-3 w-3 mr-1" />
                        Upgrade
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{getRelativeTime(event.date)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
