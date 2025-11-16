import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckoutStepperProps {
  currentStep: number;
}

const steps = [
  { number: 1, title: 'Alamat Pengiriman' },
  { number: 2, title: 'Metode Pengiriman' },
  { number: 3, title: 'Pembayaran' },
  { number: 4, title: 'Konfirmasi' },
];

export function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  return (
    <div className="w-full min-w-max">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold transition-colors text-sm sm:text-base',
                  currentStep > step.number
                    ? 'bg-primary text-primary-foreground'
                    : currentStep === step.number
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {currentStep > step.number ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.number
                )}
              </div>
              <p
                className={cn(
                  'text-xs sm:text-sm mt-1 sm:mt-2 text-center whitespace-nowrap',
                  currentStep >= step.number
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {step.title}
              </p>
            </div>
            
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 transition-colors',
                  currentStep > step.number ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
