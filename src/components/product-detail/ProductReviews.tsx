import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[] | null;
  created_at: string;
  is_verified_purchase: boolean;
  reviewer_name: string;
  reviewer_avatar: string | null;
}

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: [0, 0, 0, 0, 0],
  });

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const loadReviews = async () => {
    // Use secure public_reviews view that doesn't expose user_id
    const { data, error } = await supabase
      .from('public_reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReviews(data as Review[]);
      calculateStats(data as Review[]);
    }
    setLoading(false);
  };

  const calculateStats = (reviewData: Review[]) => {
    const total = reviewData.length;
    if (total === 0) return;

    const sum = reviewData.reduce((acc, review) => acc + review.rating, 0);
    const average = sum / total;

    const distribution = [0, 0, 0, 0, 0];
    reviewData.forEach(review => {
      distribution[review.rating - 1]++;
    });

    setStats({ average, total, distribution });
  };

  const renderStars = (rating: number, filled: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'h-4 w-4',
              star <= rating
                ? filled
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-current text-yellow-400'
                : 'text-muted-foreground'
            )}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <p className="text-muted-foreground">Memuat ulasan...</p>;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Belum Ada Ulasan</h3>
        <p className="text-muted-foreground">
          Jadilah yang pertama memberikan ulasan untuk produk ini
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-5xl font-bold mb-2">{stats.average.toFixed(1)}</p>
              {renderStars(Math.round(stats.average), true)}
              <p className="text-sm text-muted-foreground mt-2">
                Dari {stats.total} ulasan
              </p>
            </div>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.distribution[rating - 1];
                const percentage = (count / stats.total) * 100;
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-sm w-8">{rating}</span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Avatar>
                  <AvatarImage src={review.reviewer_avatar || ''} />
                  <AvatarFallback>
                    {review.reviewer_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{review.reviewer_name}</p>
                      {renderStars(review.rating)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  {review.is_verified_purchase && (
                    <span className="text-xs text-green-600 font-medium">
                      ✓ Pembelian Terverifikasi
                    </span>
                  )}
                  {review.title && (
                    <p className="font-medium">{review.title}</p>
                  )}
                  {review.comment && (
                    <p className="text-muted-foreground">{review.comment}</p>
                  )}
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {review.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Review ${index + 1}`}
                          className="w-20 h-20 object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
