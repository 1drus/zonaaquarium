import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ProductSortProps {
  sortBy: string;
  onSortChange: (value: string) => void;
}

export function ProductSort({ sortBy, onSortChange }: ProductSortProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">
        Urutkan:
      </Label>
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Terbaru</SelectItem>
          <SelectItem value="popular">Terpopuler</SelectItem>
          <SelectItem value="rating">Rating Tertinggi</SelectItem>
          <SelectItem value="price_asc">Harga Terendah</SelectItem>
          <SelectItem value="price_desc">Harga Tertinggi</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
