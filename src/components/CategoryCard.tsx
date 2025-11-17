import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface CategoryCardProps {
  title: string;
  description: string;
  image: string;
  count: number;
  slug?: string;
}

export const CategoryCard = ({ title, description, image, count, slug }: CategoryCardProps) => {
  const categoryLink = slug ? `/products?waterType=${slug}` : '/products';
  
  return (
    <Link to={categoryLink} className="block">
      <Card className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-medium cursor-pointer h-full">
        <div className="relative h-48 overflow-hidden touch-manipulation">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
            <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
            <p className="text-sm text-white/90">{count} produk tersedia</p>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          <div className="flex items-center text-primary font-medium text-sm group-hover:text-primary-dark transition-colors">
            Lihat Koleksi
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Card>
    </Link>
  );
};
