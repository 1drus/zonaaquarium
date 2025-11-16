import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Thermometer, Droplets, Package, TrendingUp } from 'lucide-react';

interface ProductSpecsProps {
  product: {
    size: string | null;
    water_type: string | null;
    origin: string | null;
    difficulty_level: string | null;
    temperature_min: number | null;
    temperature_max: number | null;
    ph_min: number | null;
    ph_max: number | null;
    min_order: number;
    max_order: number | null;
  };
}

export function ProductSpecs({ product }: ProductSpecsProps) {
  const specs = [
    {
      icon: Package,
      label: 'Ukuran',
      value: product.size || '-',
    },
    {
      icon: Droplets,
      label: 'Tipe Air',
      value: product.water_type ? product.water_type.charAt(0).toUpperCase() + product.water_type.slice(1) : '-',
    },
    {
      icon: TrendingUp,
      label: 'Tingkat Kesulitan',
      value: product.difficulty_level ? product.difficulty_level.charAt(0).toUpperCase() + product.difficulty_level.slice(1) : '-',
    },
    {
      icon: Thermometer,
      label: 'Suhu Air',
      value: product.temperature_min && product.temperature_max 
        ? `${product.temperature_min}°C - ${product.temperature_max}°C`
        : '-',
    },
    {
      icon: Droplets,
      label: 'pH Air',
      value: product.ph_min && product.ph_max 
        ? `${product.ph_min} - ${product.ph_max}`
        : '-',
    },
    {
      icon: Package,
      label: 'Asal',
      value: product.origin || '-',
    },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {specs.map((spec, index) => {
        const Icon = spec.icon;
        return (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                {spec.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{spec.value}</p>
            </CardContent>
          </Card>
        );
      })}

      {/* Order Info */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informasi Pemesanan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Minimal Order</p>
              <p className="text-lg font-semibold">{product.min_order} unit</p>
            </div>
            {product.max_order && (
              <div>
                <p className="text-sm text-muted-foreground">Maksimal Order</p>
                <p className="text-lg font-semibold">{product.max_order} unit</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
