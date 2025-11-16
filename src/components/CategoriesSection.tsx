import { CategoryCard } from "./CategoryCard";
import freshwaterImg from "@/assets/category-freshwater.jpg";
import saltwaterImg from "@/assets/category-saltwater.jpg";
import plantsImg from "@/assets/category-plants.jpg";

export const CategoriesSection = () => {
  const categories = [
    {
      title: "Ikan Air Tawar",
      description: "Koleksi ikan hias air tawar dari berbagai jenis dan ukuran",
      image: freshwaterImg,
      count: 156,
      slug: "Tawar",
    },
    {
      title: "Ikan Air Laut",
      description: "Ikan laut eksotis untuk akuarium air asin Anda",
      image: saltwaterImg,
      count: 89,
      slug: "Laut",
    },
    {
      title: "Tanaman Aquascape",
      description: "Tanaman air untuk mempercantik akuarium Anda",
      image: plantsImg,
      count: 67,
      slug: "Tanaman",
    },
  ];

  return (
    <section className="py-16 bg-gradient-light">
      <div className="container">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold">
            Kategori <span className="bg-gradient-ocean bg-clip-text text-transparent">Populer</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Jelajahi berbagai kategori ikan hias dan tanaman akuarium pilihan kami
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <CategoryCard key={category.title} {...category} />
          ))}
        </div>
      </div>
    </section>
  );
};
