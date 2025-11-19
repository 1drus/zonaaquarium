# 🐠 Zona Aquarium

**Platform E-Commerce Ikan Hias Berbasis Web Modern**

## 🌟 Gambaran Lengkap Project

**Zona Aquarium** adalah aplikasi e-commerce khusus untuk penjualan ikan hias dan perlengkapan aquarium yang dikembangkan menggunakan React, TypeScript, dan Supabase sebagai backend. Platform ini dirancang untuk menyediakan pengalaman berbelanja ikan hias yang aman, nyaman, dan terpercaya dengan fitur-fitur lengkap mulai dari katalog produk hingga manajemen pesanan.

## 🏗️ Arsitektur Sistem

### Frontend Stack
- **React 18.3.1** dengan TypeScript untuk type safety
- **Vite 5.4.19** sebagai build tool dan development server
- **React Router DOM 6.30.1** untuk client-side routing
- **Tailwind CSS 3.4.17** dengan custom ocean theme
- **shadcn/ui** component library dengan 40+ komponen
- **React Hook Form 7.61.1** dengan Zod untuk validasi form
- **TanStack Query 5.83.0** untuk data fetching dan caching

### Backend & Database
- **Supabase** sebagai Backend-as-a-Service (PostgreSQL)
- **Real-time Subscriptions** untuk update langsung keranjang
- **Row Level Security (RLS)** untuk keamanan data
- **JWT Authentication** dengan session management
- **Storage API** untuk upload gambar produk

### Integrasi Payment
- **Midtrans** sebagai payment gateway untuk transaksi aman
- **Payment verification system** untuk konfirmasi pembayaran

## 📱 Halaman dan Fitur Utama

### 1. Homepage (`/`)
**Komponen Utama:**
- `Header` dengan navigation menu dan search functionality
- `HeroSection` dengan call-to-action dan branding
- `CategoriesSection` untuk navigasi kategori produk
- `FeaturedProducts` menampilkan produk unggulan
- `Footer` dengan informasi kontak dan links

**Fitur:**
- Responsive design dengan mobile navigation
- Search bar integration untuk pencarian produk
- Category showcase dengan icon dan descriptions
- Product carousel dengan smooth animations

### 2. Katalog Produk (`/products`)
**Komponen:**
- `ProductFilters` untuk filtering berdasarkan:
  - Pencarian (search)
  - Kategori produk
  - Range harga (min/max)
  - Tingkat kesulitan perawatan (mudah/sedang/sulit)
  - Tipe air (freshwater/saltwater)
  - Ketersediaan stok
- `ProductGrid` untuk display produk dalam grid layout
- `ProductSort` untuk sorting:
  - Harga terendah-tertinggi
  - Harga tertinggi-terendah
  - Popularitas
  - Rating
  - Produk terbaru

**URL Parameters Support:**
- `?search=` untuk pencarian
- `?waterType=` untuk filter tipe air
- Dynamic filter updates dengan browser history

### 3. Authentication (`/auth`)
**Features:**
- Dual tabs untuk Login dan Register
- Form validation dengan error handling
- Email verification system
- Password recovery
- Auto-redirect setelah login berhasil
- Social media integration ready

**Komponen:**
- `LoginForm` dengan email/password fields
- `RegisterForm` dengan data validation
- `Tabs` UI untuk switch antar form

### 4. Shopping Cart (`/cart`)
**Real-time Features:**
- Live cart updates dengan Supabase subscriptions
- Quantity adjustment dengan stock validation
- Price calculation dengan variant support
- Discount calculation berdasarkan product discounts

**Komponen:**
- `CartItem` untuk display individual cart items
- `CartSummary` untuk total dan checkout button
- Loading states dan empty cart handling

### 5. Checkout (`/checkout`)
**Multi-step Process:**
1. **Address Step**: Pilih atau tambah alamat pengiriman
2. **Shipping Step**: Pilih metode pengiriman
3. **Payment Step**: Pilih metode pembayaran
4. **Order Summary**: Review pesanan sebelum konfirmasi

**Komponen:**
- `CheckoutStepper` untuk progress indicator
- `AddressStep` dengan address management
- `PaymentStep` dengan Midtrans integration
- `OrderSummary` untuk final review

### 6. Admin Dashboard (`/admin`)
**Management Features:**
- `ProductManagement` untuk CRUD produk
- `CategoryManagement` untuk kategori management
- `OrderManagement` untuk processing orders
- `UserManagement` untuk user roles dan permissions
- `PaymentVerification` untuk konfirmasi pembayaran
- `VoucherManagement` untuk promo codes
- `TierConfigManagement` untuk membership tiers
- `AdvancedAnalytics` untuk sales reporting

**Real-time Features:**
- Live stock monitoring
- Order status updates
- Low stock alerts
- Sales analytics dengan charts

## 🗄️ Database Schema

### Tabel Utama

**Products:**
```sql
- id (uuid, primary key)
- name (text)
- slug (text, unique)
- description (text)
- price (numeric)
- discount_percentage (numeric)
- stock_quantity (integer)
- category_id (uuid, foreign key)
- difficulty_level (enum: mudah/sedang/sulit)
- water_type (text)
- ph_min/ph_max (numeric)
- temperature_min/temperature_max (numeric)
- origin (text)
- care_instructions (text)
- is_active (boolean)
- rating_average (numeric)
- review_count (integer)
```

**Product Variants:**
```sql
- id (uuid, primary key)
- product_id (uuid, foreign key)
- variant_name (text)
- color (text)
- size (text)
- sku (text)
- price_adjustment (numeric)
- stock_quantity (integer)
- is_active (boolean)
```

**Categories:**
```sql
- id (uuid, primary key)
- name (text)
- slug (text, unique)
- description (text)
- icon (text)
- parent_id (uuid, self-referencing)
- display_order (integer)
- is_active (boolean)
```

**Orders:**
```sql
- id (uuid, primary key)
- order_number (text, unique)
- user_id (uuid, foreign key)
- status (enum: menunggu_pembayaran/diproses/dikirim/selesai/dibatalkan)
- payment_status (enum: pending/paid/failed/expired)
- payment_method (text)
- payment_proof_url (text)
- subtotal (numeric)
- discount_amount (numeric)
- shipping_cost (numeric)
- total_amount (numeric)
- shipping_address (text)
- recipient_name/phone (text)
- notes (text)
- created_at/paid_at/shipped_at/completed_at (timestamp)
```

**Order Items:**
```sql
- id (uuid, primary key)
- order_id (uuid, foreign key)
- product_id (uuid, foreign key)
- variant_id (uuid, foreign key, nullable)
- product_name (text)
- product_slug (text)
- variant_name (text)
- sku (text)
- price (numeric)
- quantity (integer)
- subtotal (numeric)
- discount_percentage (numeric)
```

**Cart Items:**
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- product_id (uuid, foreign key)
- variant_id (uuid, foreign key, nullable)
- quantity (integer)
- created_at/updated_at (timestamp)
```

**User Management:**
- `profiles` untuk user information
- `user_roles` untuk role assignment (admin/customer)
- `addresses` untuk shipping addresses
- `member_progress` untuk tier progression
- `member_tier_config` untuk tier configurations

**Reviews System:**
```sql
- id (uuid, primary key)
- product_id (uuid, foreign key)
- user_id (uuid, foreign key)
- order_id (uuid, foreign key, nullable)
- rating (integer, 1-5)
- title (text)
- comment (text)
- images (text array)
- is_verified_purchase (boolean)
- is_visible (boolean)
```

**Vouchers & Promotions:**
```sql
- vouchers (table)
- voucher_usage (table)
- user_tier_vouchers (table)
- tier_exclusive_vouchers (table)
```

### Database Functions
- `generate_order_number()` untuk unique order numbers
- `generate_unique_voucher_code()` untuk voucher generation
- `assign_tier_voucher()` untuk tier-based vouchers
- `has_role()`, `set_user_role()` untuk role management
- `cleanup_expired_verification_codes()` untuk maintenance

## 🎨 Design System

### Color Palette
```css
--primary: Ocean blue gradient
--secondary: Coral accent colors
--accent: Aqua green shades
--background: Light/dark mode support
--muted: Soft grays
```

### Custom Animations
```css
- float: untuk ocean-themed elements
- wave: untuk water effects
- shimmer: untuk loading states
- gradient: untuk background animations
- fade-in/scale-in: untuk smooth transitions
```

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px
- Large Desktop: > 1400px

## 🔐 Security Features

### Authentication & Authorization
- JWT tokens dengan refresh mechanism
- Role-based access control (Admin/Customer)
- Email verification system
- Password hash dengan bcrypt
- Session management dengan localStorage

### Data Protection
- Row Level Security (RLS) di Supabase
- Input validation dengan Zod schemas
- XSS protection melalui React
- CSRF protection via Supabase
- SQL injection prevention

### Payment Security
- Midtrans secure payment gateway
- Payment proof verification
- SSL encryption untuk data transmission
- Secure headers configuration

## 📊 Real-time Features

### Cart Management
- Real-time cart updates menggunakan Supabase subscriptions
- Multi-device synchronization
- Stock validation saat add to cart
- Price updates dengan variant support

### Order Management
- Live order status updates
- Admin notifications untuk new orders
- Payment verification alerts
- Stock level monitoring

### User Experience
- Toast notifications untuk user feedback
- Loading states dengan skeleton screens
- Error boundaries untuk graceful error handling
- Optimistic updates untuk better perceived performance

## 🚀 Deployment & Environment

### Development
```bash
npm run dev    # Development server (port 8080)
npm run build  # Production build
npm run preview # Preview production build
```

### Environment Variables
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
VITE_MIDTRANS_CLIENT_KEY=your_midtrans_key
```

### Build Configuration
- Vite dengan SWC plugin untuk fast builds
- Path alias `@/` untuk clean imports
- Code splitting untuk optimal bundle sizes
- Asset optimization untuk production

## 📱 Mobile Responsiveness

### Mobile-First Design
- Touch-friendly interfaces dengan proper tap targets
- Swipe gestures untuk product galleries
- Mobile-optimized navigation dengan hamburger menu
- Responsive images dengan lazy loading

### Progressive Enhancement
- Core functionality works tanpa JavaScript
- Enhanced experiences dengan JavaScript enabled
- Offline support considerations
- Network-aware loading strategies

## 🔄 User Flow Implementation

### Customer Journey
1. **Discovery**: Browse products dengan advanced filtering
2. **Consideration**: View product details dengan reviews dan ratings
3. **Purchase**: Add to cart dan checkout process
4. **Post-Purchase**: Order tracking dan review system

### Admin Workflow
1. **Product Management**: Upload products dengan variant support
2. **Order Processing**: Verify payments dan update status
3. **Customer Support**: Handle cancellations dan issues
4. **Analytics**: Monitor sales dan customer behavior

## 🧪 Testing & Quality Assurance

### Code Quality
- ESLint untuk code linting
- TypeScript untuk type safety
- Zod untuk runtime validation
- React Hook Form untuk form validation

### Performance Optimizations
- Code splitting dengan dynamic imports
- Image optimization dengan lazy loading
- Caching strategies dengan TanStack Query
- Bundle size optimization

## 🌟 Unique Features

### Indonesian Market Focus
- Bahasa Indonesia untuk primary language
- Local payment methods (Midtrans integration)
- Indonesian address format support
- Local species focus untuk aquarium market

### Advanced E-commerce Features
- Product variant system
- Multi-tier membership program
- Voucher dan promotional system
- Advanced analytics dashboard
- Review dan rating system dengan image uploads

### Aquarium-Specific Features
- Water parameter filtering (pH, temperature)
- Difficulty level classification
- Care instructions system
- Compatibility information
- Species-specific metadata

---

**Project ini dikembangkan sebagai platform e-commerce modern yang fokus pada market ikan hias di Indonesia dengan teknologi terkini dan best practices dalam web development.**
