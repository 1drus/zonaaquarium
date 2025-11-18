# Sistem Auto-Generate Voucher untuk Tier

## Deskripsi
Sistem ini secara otomatis memberikan voucher eksklusif kepada user saat mereka naik tier membership. Voucher digenerate berdasarkan template yang dikonfigurasi di tabel `tier_exclusive_vouchers`.

## Cara Kerja

### 1. Trigger Otomatis
Saat user menyelesaikan order dengan status `selesai` dan `payment_status = 'paid'`:
- Fungsi `update_member_tier()` akan dipanggil secara otomatis
- Sistem menghitung total spending dan menentukan tier baru
- Jika tier berubah (naik), fungsi `assign_tier_voucher()` dipanggil

### 2. Generate Voucher
Fungsi `assign_tier_voucher(_user_id, _tier_name)`:
- Cek apakah user sudah pernah menerima voucher untuk tier tersebut
- Ambil template voucher dari tabel `tier_exclusive_vouchers` berdasarkan tier
- Generate kode voucher unik dengan prefix dari template
- Buat voucher baru di tabel `vouchers`
- Record di tabel `user_tier_vouchers` untuk tracking

### 3. Notifikasi Real-time
Frontend menggunakan Supabase Realtime untuk mendeteksi voucher baru:
- Subscribe ke perubahan tabel `user_tier_vouchers`
- Saat INSERT terdeteksi, tampilkan toast notification
- Voucher langsung muncul di halaman Profile user

## Konfigurasi Template Voucher

### Admin Panel
Admin dapat mengkonfigurasi template voucher di **Admin Dashboard → Tier Config**:
- Pilih tier (Silver, Gold, Platinum)
- Set prefix kode voucher (contoh: SILVER, GOLD, PLAT)
- Tentukan tipe diskon (percentage/fixed)
- Set nilai diskon
- Set minimum pembelian
- Set max diskon (untuk percentage)
- Set masa berlaku (valid_days)

### Tabel Database: `tier_exclusive_vouchers`
```sql
- tier_name: Silver/Gold/Platinum
- voucher_code_prefix: Prefix untuk generate kode unik
- description: Deskripsi voucher
- discount_type: 'percentage' atau 'fixed'
- discount_value: Nilai diskon
- min_purchase: Minimum pembelian (Rp)
- max_discount: Max diskon untuk percentage (Rp)
- valid_days: Masa berlaku sejak diterima (hari)
```

## Fitur Keamanan

### Pencegahan Duplikasi
- Satu user hanya bisa mendapat satu voucher per tier
- Check dilakukan di fungsi `assign_tier_voucher()`

### Validasi Penggunaan
Saat apply voucher di checkout (`useVoucher.tsx`):
- Validasi tier user saat ini
- Check apakah voucher sesuai dengan tier user
- Validasi masa berlaku
- Check limit penggunaan

### Row Level Security (RLS)
```sql
-- User hanya bisa lihat voucher mereka sendiri
user_tier_vouchers: user_id = auth.uid()

-- Admin bisa lihat semua
has_role(auth.uid(), 'admin')
```

## Testing

### Test Auto-Generate
1. Login sebagai user biasa
2. Lakukan pembelian hingga mencapai threshold tier berikutnya
3. Complete order (status: selesai, payment_status: paid)
4. Check member_progress - tier harus naik
5. Check user_tier_vouchers - voucher baru harus muncul
6. Buka halaman Profile - notifikasi voucher harus muncul

### Test di Different Tiers
- Bronze → Silver: Voucher SILVER-XXXXXX
- Silver → Gold: Voucher GOLD-XXXXXX  
- Gold → Platinum: Voucher PLAT-XXXXXX

### Test Notification
1. Buka halaman Profile saat tier naik
2. Harus ada confetti celebration
3. Toast notification tier upgrade
4. Toast notification voucher baru
5. Voucher muncul di section "Voucher Eksklusif Anda"

## Monitoring

### Check Logs
```sql
-- Lihat voucher yang sudah diberikan
SELECT 
  utv.*,
  v.code,
  v.valid_until,
  p.full_name
FROM user_tier_vouchers utv
JOIN vouchers v ON v.id = utv.voucher_id
JOIN profiles p ON p.id = utv.user_id
ORDER BY utv.assigned_at DESC;

-- Lihat user yang baru naik tier
SELECT 
  mp.*,
  p.full_name
FROM member_progress mp
JOIN profiles p ON p.id = mp.user_id
WHERE mp.tier_upgraded_at > NOW() - INTERVAL '7 days'
ORDER BY mp.tier_upgraded_at DESC;
```

### Edge Function Logs
Monitor edge function `notify-tier-voucher` untuk notifikasi:
```bash
# Check di Admin Dashboard → Edge Function Logs
# Filter: notify-tier-voucher
```

## Troubleshooting

### Voucher Tidak Auto-Generate
1. Check trigger `update_member_tier` aktif
2. Verify fungsi `assign_tier_voucher` ada
3. Check template voucher untuk tier tersebut exists
4. Verify user belum pernah dapat voucher untuk tier tersebut

### Notifikasi Tidak Muncul
1. Check realtime subscription di browser console
2. Verify kolom `is_notified` di `user_tier_vouchers`
3. Check komponen `MemberProgress` loaded
4. Clear browser cache dan reload

### Voucher Tidak Bisa Dipakai
1. Check `allowed_tiers` di tabel vouchers
2. Verify user tier saat ini
3. Check valid_from dan valid_until
4. Verify usage_limit tidak terlampaui

## Development

### Modify Template
Edit di Admin Dashboard atau direct SQL:
```sql
UPDATE tier_exclusive_vouchers
SET 
  discount_value = 15,
  min_purchase = 150000,
  max_discount = 50000
WHERE tier_name = 'Silver';
```

### Add New Tier
1. Add tier config di `member_tier_config`
2. Add voucher template di `tier_exclusive_vouchers`
3. Update frontend tier colors/icons jika perlu

### Custom Notification
Edit fungsi `showVoucherNotification` di `MemberProgress.tsx`:
```typescript
const showVoucherNotification = async (newVoucher: TierVoucher) => {
  // Custom notification logic
}
```

## Best Practices

1. **Template Configuration**
   - Set discount yang menarik untuk encourage tier upgrade
   - Balance antara generosity dan profitability
   - Consider min_purchase yang realistis

2. **Validity Period**
   - Jangan terlalu pendek (min 30 hari)
   - Jangan terlalu lama (max 90 hari)
   - Balance urgency dan fairness

3. **Communication**
   - Explain voucher benefit jelas di UI
   - Show voucher di multiple touchpoints
   - Remind user sebelum expired

4. **Monitoring**
   - Track redemption rate per tier
   - Monitor voucher usage patterns
   - Adjust template based on data
