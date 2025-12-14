import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CategoriesSection } from "@/components/CategoriesSection";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { FlashSaleSection } from "@/components/FlashSaleSection";
import { Footer } from "@/components/Footer";
import { LoadingScreen } from "@/components/LoadingScreen";

const Index = () => {
  return (
    <>
      <LoadingScreen />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <HeroSection />
          <FlashSaleSection />
          <CategoriesSection />
          <FeaturedProducts />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
