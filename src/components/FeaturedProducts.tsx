import { ProductCard } from "./ProductCard";
import freshwaterImg from "@/assets/category-freshwater.jpg";
import saltwaterImg from "@/assets/category-saltwater.jpg";
import plantsImg from "@/assets/category-plants.jpg";

export const FeaturedProducts = () => {
  const products = [
    {
      name: "Ikan Cupang Halfmoon Super Red",
      price: 75000,
      originalPrice: 100000,
      image: freshwaterImg,
      rating: 4.8,
      reviews: 124,
      category: "Air Tawar",
      inStock: true,
      isNew: true,
      discount: 25,
    },
    {
      name: "Clownfish Premium (Ikan Nemo)",
      price: 150000,
      image: saltwaterImg,
      rating: 4.9,
      reviews: 89,
      category: "Air Laut",
      inStock: true,
      isNew: true,
    },
    {
      name: "Paket Tanaman Aquascape Pemula",
      price: 85000,
      originalPrice: 120000,
      image: plantsImg,
      rating: 4.7,
      reviews: 156,
      category: "Tanaman",
      inStock: true,
      discount: 29,
    },
    {
      name: "Guppy Mixed Color (5 Ekor)",
      price: 50000,
      image: freshwaterImg,
      rating: 4.6,
      reviews: 203,
      category: "Air Tawar",
      inStock: true,
    },
    {
      name: "Yellow Tang Juvenile",
      price: 350000,
      image: saltwaterImg,
      rating: 4.9,
      reviews: 45,
      category: "Air Laut",
      inStock: false,
    },
    {
      name: "Java Moss Premium Grade",
      price: 35000,
      image: plantsImg,
      rating: 4.8,
      reviews: 178,
      category: "Tanaman",
      inStock: true,
    },
  ];

  return (
    <section className="py-16">
      <div className="container">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold">
            Produk <span className="bg-gradient-ocean bg-clip-text text-transparent">Unggulan</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Pilihan terbaik dari koleksi kami dengan kualitas premium
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, index) => (
            <ProductCard key={index} {...product} />
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="px-8 py-3 rounded-lg border-2 border-primary text-primary font-semibold hover:bg-primary hover:text-primary-foreground transition-colors">
            Lihat Semua Produk
          </button>
        </div>
      </div>
    </section>
  );
};
