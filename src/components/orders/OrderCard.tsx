import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from './OrderStatusBadge';
import { ChevronRight } from 'lucide-react';

interface OrderCardProps {
  order: {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total_amount: number;
    created_at: string;
    order_items: Array<{
      product_name: string;
      product_image_url: string | null;
      quantity: number;
    }>;
  };
}

export function OrderCard({ order }: OrderCardProps) {
  const navigate = useNavigate();
  const firstThreeItems = order.order_items.slice(0, 3);
  const remainingCount = order.order_items.length - 3;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-semibold">{order.order_number}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <OrderStatusBadge status={order.status} />
            <OrderStatusBadge status={order.payment_status} isPaymentStatus />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          {firstThreeItems.map((item, index) => (
            <div key={index} className="relative">
              <img
                src={item.product_image_url || '/placeholder.svg'}
                alt={item.product_name}
                className="w-16 h-16 object-cover rounded"
              />
              {item.quantity > 1 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {item.quantity}
                </span>
              )}
            </div>
          ))}
          {remainingCount > 0 && (
            <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
              <span className="text-sm font-medium">+{remainingCount}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Belanja</p>
            <p className="text-lg font-bold text-primary">
              Rp {order.total_amount.toLocaleString('id-ID')}
            </p>
          </div>
          <Button variant="outline" size="sm">
            Lihat Detail
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
