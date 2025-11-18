import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Gift, Info } from 'lucide-react';

export function TierVoucherInfo() {
  return (
    <Alert className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="flex items-start gap-3">
        <Gift className="h-5 w-5 text-primary mt-0.5" />
        <div className="space-y-2">
          <AlertTitle className="flex items-center gap-2">
            <span>Voucher Eksklusif Otomatis</span>
            <Info className="h-4 w-4 text-muted-foreground" />
          </AlertTitle>
          <AlertDescription className="text-sm space-y-2">
            <p>
              🎉 Dapatkan voucher eksklusif secara otomatis saat Anda naik tier!
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
              <li>Voucher akan diberikan langsung saat tier Anda meningkat</li>
              <li>Setiap tier memiliki voucher dengan benefit berbeda</li>
              <li>Voucher dapat digunakan untuk pembelian berikutnya</li>
              <li>Notifikasi akan muncul otomatis saat voucher tersedia</li>
            </ul>
            <p className="text-xs text-muted-foreground italic mt-2">
              Terus berbelanja untuk naik tier dan dapatkan voucher eksklusif Anda!
            </p>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
