import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-aquarium.jpg";

export const HeroSection = () => {
  return (
    <section className="relative h-[500px] md:h-[600px] overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Beautiful tropical fish in aquarium"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent pointer-events-none" />
      </div>

      {/* Content */}
      <div className="container relative z-10 h-full flex items-center">
        <div className="max-w-2xl space-y-6 animate-in fade-in slide-in-from-left duration-700">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Koleksi Ikan Hias
            <span className="block bg-gradient-ocean bg-clip-text text-transparent">
              Terlengkap & Berkualitas
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
            Temukan berbagai jenis ikan hias air tawar dan laut untuk mempercantik
            akuarium Anda. Garansi kualitas terbaik.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="bg-gradient-ocean hover:opacity-90 transition-opacity group" asChild>
              <Link to="/products">
                Belanja Sekarang
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10" asChild>
              <Link to="/products">
                Lihat Katalog
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative Wave */}
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none select-none">
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,50 C240,80 480,20 720,50 C960,80 1200,20 1440,50 L1440,100 L0,100 Z"
            className="fill-background"
          />
        </svg>
      </div>
    </section>
  );
};
