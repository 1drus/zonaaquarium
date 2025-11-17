import { useEffect, useState } from "react";
import zonaLogo from "@/assets/zona-aquarium-logo.png";

export const LoadingScreen = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background animate-fade-out">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse">
            <div className="h-32 w-32 rounded-full bg-primary/20 blur-2xl"></div>
          </div>
          <img 
            src={zonaLogo} 
            alt="Zona Aquarium" 
            className="relative h-32 w-32 object-contain animate-scale-in"
          />
        </div>
        <div className="flex flex-col items-center gap-2 animate-fade-in">
          <h1 className="text-3xl font-bold bg-gradient-ocean bg-clip-text text-transparent">
            Zona Aquarium
          </h1>
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]"></div>
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]"></div>
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
