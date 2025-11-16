import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Star, Eye, EyeOff, Trash2 } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  images: string[] | null;
  is_visible: boolean;
  is_verified_purchase: boolean;
  created_at: string;
  user_id: string;
  product_id: string;
}

interface ReviewWithDetails extends Review {
  profiles: { full_name: string; avatar_url: string | null };
  products: { name: string };
}

export function ReviewManagement() {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<ReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');

  useEffect(() => {
    loadReviews();
  }, []);

  useEffect(() => {
    let filtered = reviews;

    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.products.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (visibilityFilter === 'visible') {
      filtered = filtered.filter((r) => r.is_visible);
    } else if (visibilityFilter === 'hidden') {
      filtered = filtered.filter((r) => !r.is_visible);
    }

    setFilteredReviews(filtered);
  }, [searchQuery, visibilityFilter, reviews]);

  const loadReviews = async () => {
    const { data: reviewsData, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal memuat reviews',
        description: error.message,
      });
      return;
    }

    // Fetch related data
    const userIds = [...new Set(reviewsData.map((r) => r.user_id))];
    const productIds = [...new Set(reviewsData.map((r) => r.product_id))];

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    const { data: productsData } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds);

    const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);
    const productsMap = new Map(productsData?.map((p) => [p.id, p]) || []);

    const reviewsWithDetails = reviewsData.map((review) => ({
      ...review,
      profiles: profilesMap.get(review.user_id) || { full_name: 'User', avatar_url: null },
      products: productsMap.get(review.product_id) || { name: 'Unknown Product' },
    }));

    setReviews(reviewsWithDetails as ReviewWithDetails[]);
    setFilteredReviews(reviewsWithDetails as ReviewWithDetails[]);
    setLoading(false);
  };

  const handleToggleVisibility = async (reviewId: string, currentVisibility: boolean) => {
    const { error } = await supabase
      .from('reviews')
      .update({ is_visible: !currentVisibility })
      .eq('id', reviewId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal update visibility',
        description: error.message,
      });
    } else {
      toast({
        title: 'Visibility diperbarui',
        description: `Review ${!currentVisibility ? 'ditampilkan' : 'disembunyikan'}`,
      });
      loadReviews();
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Yakin ingin menghapus review ini?')) return;

    const { error } = await supabase.from('reviews').delete().eq('id', reviewId);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal menghapus review',
        description: error.message,
      });
    } else {
      toast({
        title: 'Review dihapus',
        description: 'Review berhasil dihapus',
      });
      loadReviews();
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <p className="text-muted-foreground">Memuat reviews...</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari review..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Review</SelectItem>
                <SelectItem value="visible">Ditampilkan</SelectItem>
                <SelectItem value="hidden">Disembunyikan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={review.profiles.avatar_url || ''} />
                          <AvatarFallback>
                            {review.profiles.full_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{review.profiles.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {review.products.name}
                    </TableCell>
                    <TableCell>{renderStars(review.rating)}</TableCell>
                    <TableCell className="max-w-[300px]">
                      {review.title && (
                        <p className="font-medium text-sm truncate">{review.title}</p>
                      )}
                      {review.comment && (
                        <p className="text-sm text-muted-foreground truncate">{review.comment}</p>
                      )}
                      {review.images && review.images.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📷 {review.images.length} foto
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={review.is_visible ? 'default' : 'secondary'}>
                          {review.is_visible ? 'Tampil' : 'Hidden'}
                        </Badge>
                        {review.is_verified_purchase && (
                          <Badge variant="outline" className="text-xs">
                            ✓ Verified
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(review.created_at).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleVisibility(review.id, review.is_visible)}
                        >
                          {review.is_visible ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(review.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
