import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Settings, Eye, EyeOff, Save } from 'lucide-react';
import { ShippingOriginSettings } from './ShippingOriginSettings';

export function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [isProduction, setIsProduction] = useState(false);
  const [sandboxClientKey, setSandboxClientKey] = useState('');
  const [productionClientKey, setProductionClientKey] = useState('');
  const [showSandboxKey, setShowSandboxKey] = useState(false);
  const [showProductionKey, setShowProductionKey] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_key, config_value')
        .in('config_key', ['midtrans_environment', 'midtrans_client_key_sandbox', 'midtrans_client_key_production']);

      if (error) throw error;
      
      data?.forEach(item => {
        if (item.config_key === 'midtrans_environment') {
          setIsProduction(item.config_value === 'production');
        } else if (item.config_key === 'midtrans_client_key_sandbox') {
          setSandboxClientKey(item.config_value?.includes('YOUR_') ? '' : item.config_value || '');
        } else if (item.config_key === 'midtrans_client_key_production') {
          setProductionClientKey(item.config_value?.includes('YOUR_') ? '' : item.config_value || '');
        }
      });
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

  const handleSaveClientKeys = async () => {
    setSavingKeys(true);
    try {
      const updates = [];
      
      if (sandboxClientKey) {
        updates.push(
          supabase
            .from('system_config')
            .update({ 
              config_value: sandboxClientKey,
              updated_at: new Date().toISOString()
            })
            .eq('config_key', 'midtrans_client_key_sandbox')
        );
      }
      
      if (productionClientKey) {
        updates.push(
          supabase
            .from('system_config')
            .update({ 
              config_value: productionClientKey,
              updated_at: new Date().toISOString()
            })
            .eq('config_key', 'midtrans_client_key_production')
        );
      }

      await Promise.all(updates);
      toast.success('Client Key berhasil disimpan');
    } catch (error) {
      console.error('Error saving client keys:', error);
      toast.error('Gagal menyimpan Client Key');
    } finally {
      setSavingKeys(false);
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Pengaturan Midtrans</CardTitle>
          </div>
          <CardDescription>
            Kelola konfigurasi payment gateway Midtrans
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Toggle */}
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
            </div>
            <Switch
              id="midtrans-mode"
              checked={isProduction}
              onCheckedChange={handleToggle}
              disabled={saving}
            />
          </div>

          {/* Client Keys */}
          <div className="space-y-4 rounded-lg border p-4">
            <div>
              <Label className="text-base font-semibold">Client Keys</Label>
              <p className="text-sm text-muted-foreground">
                Client Key digunakan untuk memuat Snap.js di frontend. Dapatkan dari Dashboard Midtrans.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sandbox-key">Sandbox Client Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="sandbox-key"
                    type={showSandboxKey ? 'text' : 'password'}
                    value={sandboxClientKey}
                    onChange={(e) => setSandboxClientKey(e.target.value)}
                    placeholder="SB-Mid-client-xxxxx"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSandboxKey(!showSandboxKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSandboxKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="production-key">Production Client Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="production-key"
                    type={showProductionKey ? 'text' : 'password'}
                    value={productionClientKey}
                    onChange={(e) => setProductionClientKey(e.target.value)}
                    placeholder="Mid-client-xxxxx"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProductionKey(!showProductionKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showProductionKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button onClick={handleSaveClientKeys} disabled={savingKeys}>
              {savingKeys ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Simpan Client Keys
            </Button>
          </div>

          {/* Info */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">Cara mendapatkan Client Key:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>
                <strong>Sandbox:</strong> Login ke{' '}
                <a 
                  href="https://dashboard.sandbox.midtrans.com/settings/config_info" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Dashboard Sandbox
                </a>
                {' → Settings → Access Keys'}
              </li>
              <li>
                <strong>Production:</strong> Login ke{' '}
                <a 
                  href="https://dashboard.midtrans.com/settings/config_info" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Dashboard Production
                </a>
                {' → Settings → Access Keys'}
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <ShippingOriginSettings />
    </div>
  );
}