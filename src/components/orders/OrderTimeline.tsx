import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Clock, Package, Truck, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderTimelineProps {
  order: {
    status: string;
    created_at: string;
    paid_at: string | null;
    shipped_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    payment_status: string;
  };
}

export function OrderTimeline({ order }: OrderTimelineProps) {
  const isCancelled = order.status === 'dibatalkan';

  const steps = [
    {
      key: 'created',
      label: 'Pesanan Dibuat',
      icon: Package,
      date: order.created_at,
      completed: true,
    },
    {
      key: 'paid',
      label: 'Pembayaran Diterima',
      icon: CheckCircle2,
      date: order.paid_at,
      completed: order.payment_status === 'paid',
    },
    {
      key: 'processed',
      label: 'Pesanan Diproses',
      icon: Clock,
      date: order.paid_at,
      completed: ['diproses', 'dikirim', 'selesai'].includes(order.status),
    },
    {
      key: 'shipped',
      label: 'Pesanan Dikirim',
      icon: Truck,
      date: order.shipped_at,
      completed: ['dikirim', 'selesai'].includes(order.status),
    },
    {
      key: 'completed',
      label: 'Pesanan Selesai',
      icon: CheckCircle2,
      date: order.completed_at,
      completed: order.status === 'selesai',
    },
  ];

  if (isCancelled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Status Pesanan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-destructive">
            <XCircle className="h-6 w-6" />
            <div>
              <p className="font-semibold">Pesanan Dibatalkan</p>
              {order.cancelled_at && (
                <p className="text-sm text-muted-foreground">
                  {new Date(order.cancelled_at).toLocaleString('id-ID', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Tracking Pesanan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.key} className="relative flex gap-4">
                {/* Timeline line */}
                {!isLast && (
                  <div
                    className={cn(
                      'absolute left-[15px] top-8 w-0.5 h-full',
                      step.completed ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}

                {/* Icon */}
                <div className={cn(
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                  step.completed
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted bg-background text-muted-foreground'
                )}>
                  {step.completed ? (
                    <Icon className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-6">
                  <p className={cn(
                    'font-medium',
                    step.completed ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {step.label}
                  </p>
                  {step.date && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(step.date).toLocaleString('id-ID', {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
