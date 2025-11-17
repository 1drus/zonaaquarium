import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Settings } from 'lucide-react';

export function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'midtrans_environment')
        .single();

      if (error) throw error;
      
      setIsProduction(data?.config_value === 'production');
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Gagal memuat konfigurasi');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    try {
      const newValue = checked ? 'production' : 'sandbox';
      
      const { error } = await supabase
        .from('system_config')
        .update({ 
          config_value: newValue,
          updated_at: new Date().toISOString()
        })
        .eq('config_key', 'midtrans_environment');

      if (error) throw error;

      setIsProduction(checked);
      toast.success(
        checked 
          ? 'Mode Production diaktifkan' 
          : 'Mode Sandbox diaktifkan',
        {
          description: checked 
            ? 'Transaksi sekarang menggunakan Midtrans Production' 
            : 'Transaksi sekarang menggunakan Midtrans Sandbox untuk testing'
        }
      );
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Gagal mengubah environment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <CardTitle>Pengaturan Sistem</CardTitle>
        </div>
        <CardDescription>
          Kelola konfigurasi sistem dan integrasi payment gateway
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="midtrans-mode" className="text-base font-semibold">
              Midtrans Environment
            </Label>
            <p className="text-sm text-muted-foreground">
              {isProduction ? (
                <>
                  <span className="font-medium text-green-600">Mode Production</span> - Transaksi menggunakan server production Midtrans
                </>
              ) : (
                <>
                  <span className="font-medium text-orange-600">Mode Sandbox</span> - Testing dengan server sandbox Midtrans
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              ⚠️ Pastikan MIDTRANS_SERVER_KEY sesuai dengan environment yang dipilih
            </p>
          </div>
          <Switch
            id="midtrans-mode"
            checked={isProduction}
            onCheckedChange={handleToggle}
            disabled={saving}
          />
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <p className="text-sm font-medium">Informasi Environment:</p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
            <li>
              <strong>Sandbox:</strong> Untuk testing, gunakan Sandbox Server Key dari{' '}
              <a 
                href="https://dashboard.sandbox.midtrans.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Dashboard Sandbox
              </a>
            </li>
            <li>
              <strong>Production:</strong> Untuk transaksi real, gunakan Production Server Key dari{' '}
              <a 
                href="https://dashboard.midtrans.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Dashboard Production
              </a>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}