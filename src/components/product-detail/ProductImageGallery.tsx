import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
        <img
          src="/placeholder.svg"
          alt={productName}
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
        <img
          src={images[selectedImage].image_url}
          alt={productName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedImage(index)}
              className={cn(
                'aspect-square rounded-lg overflow-hidden border-2 transition-colors',
                selectedImage === index
                  ? 'border-primary'
                  : 'border-transparent hover:border-muted-foreground/50'
              )}
            >
              <img
                src={image.image_url}
                alt={`${productName} ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
