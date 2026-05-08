# KampusPay Lite

KampusPay Lite adalah aplikasi web untuk membuat dan membagikan payment link berbasis invoice untuk kebutuhan pembayaran kampus. Aplikasi ini memakai Solana Devnet agar pembayaran dapat diverifikasi on-chain melalui Solana Explorer, tanpa bukti transfer manual atau screenshot.

Proyek ini dibangun dengan React, Vite, React Router, Solana Wallet Adapter, Supabase, dan `@solana/web3.js`.

## Fitur Utama

- Membuat invoice berisi judul, deskripsi, nominal SOL, kategori, dan wallet penerima.
- Menghasilkan payment link dan QR code untuk setiap invoice.
- Pembayaran invoice menggunakan wallet Solana yang terhubung.
- Verifikasi transaksi melalui Solana Explorer di jaringan Devnet.
- Dashboard invoice dengan status paid/unpaid, total invoice, dan total SOL terkumpul.
- Marketplace kampus untuk katalog jualan kantin, event, merchandise, dan jasa mahasiswa.
- Supabase Auth untuk akun student dan seller.
- Dashboard student untuk riwayat pembayaran dan purchased items.
- Dashboard seller untuk produk, order, revenue, dan export order.
- Checkout marketplace yang membuat invoice dan order otomatis.
- Multiple Payment Methods: Solana Devnet Wallet, QRIS Simulation, Cash on Pickup, dan Bank Transfer Simulation.
- Order Timeline untuk melacak progres invoice dari dibuat, pembayaran dikirim, konfirmasi seller, sampai pickup.
- Product Pickup Code setelah pembayaran marketplace berhasil.
- Verified Campus Seller Badge yang dihitung dari produk aktif dan paid order.
- Kampus AI Assistant, chat bubble rule-based untuk rekomendasi produk, seller terpercaya, order, pickup code, dan bantuan pembayaran.
- Faucet Devnet bawaan untuk meminta SOL testnet saat pengujian.
- Penyimpanan profile, seller, product, invoice, dan order menggunakan Supabase.

## Use Case

KampusPay Lite cocok untuk simulasi atau prototipe pembayaran kampus seperti:

- Iuran kelas.
- Tiket acara kampus.
- Donasi organisasi.
- Pembayaran kantin.
- Kas organisasi mahasiswa.
- Pembayaran lain yang membutuhkan bukti transaksi transparan.

## Teknologi

- React 19
- Vite
- React Router DOM
- Solana Web3.js
- Solana Wallet Adapter
- Supabase
- QRCode React
- ESLint
- Vite Node Polyfills

## Prasyarat

Pastikan sudah terpasang:

- Node.js
- npm
- Wallet Solana browser extension, misalnya Phantom, Backpack, atau Solflare
- Project Supabase untuk menyimpan invoice dan item marketplace

Catatan: aplikasi berjalan di Solana Devnet. SOL yang digunakan adalah token testnet, bukan aset mainnet.

## Instalasi

```bash
npm install
```

## Konfigurasi Supabase

1. Buat project di Supabase.
2. Buka SQL Editor, lalu jalankan isi file `supabase-schema.sql`.
3. Salin `.env.example` menjadi `.env`.
4. Isi environment variable berikut:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Catatan: schema saat ini memakai policy publik untuk kebutuhan demo/prototipe. Untuk production, batasi policy berdasarkan autentikasi atau role penjual/admin.

## Fitur Marketplace MVP

### Product Pickup Code

Setelah student berhasil membayar order marketplace di Solana Devnet, KampusPay membuat pickup code seperti `KP-4821-7390`. Kode ini muncul di halaman pembayaran sukses, dashboard student, dan halaman seller orders. Student menunjukkan kode tersebut ke seller saat mengambil barang, lalu seller bisa menandai order sebagai `Picked Up`.

### Verified Campus Seller Badge

Badge seller dihitung otomatis dari aktivitas marketplace:

- `New Seller` - belum punya produk aktif dan belum ada paid order.
- `Campus Seller` - punya minimal 1 produk aktif.
- `Verified Campus Seller` - punya minimal 1 paid order.
- `Trusted Seller` - punya minimal 5 paid order.

Trust score dihitung dari rasio paid order terhadap total order. Badge dan trust score tampil di kartu produk, detail produk, seller dashboard, dan seller orders.

### Kampus AI Assistant

Kampus AI Assistant adalah floating chat assistant untuk student. Untuk MVP, assistant ini belum memakai external AI API dan masih berupa rule-based smart recommendation engine yang membaca data Supabase. Assistant bisa membantu mencari makanan, produk murah, produk populer, seller terpercaya, riwayat order, pickup code, pending pickup, dan bantuan pembayaran. Nanti fitur ini bisa ditingkatkan ke integrasi LLM tanpa mengubah konsep UI utama.

### Multiple Payment Methods

KampusPay Lite sekarang menyediakan beberapa metode pembayaran pada halaman invoice:

- `Solana Devnet Wallet` - pembayaran Web3 utama. Transaksi dikirim di Solana Devnet dan bisa diverifikasi lewat Solana Explorer.
- `QRIS Simulation` - simulasi alur QRIS lokal Indonesia untuk kebutuhan demo hackathon. Student scan QR demo, mengirim konfirmasi, lalu seller melakukan konfirmasi manual sebelum status menjadi `Paid Demo`.
- `Cash on Pickup` - student melakukan reservasi order dan membayar langsung ke seller saat mengambil item. Pickup code tetap dibuat untuk proses pengambilan.
- `Bank Transfer Simulation` - instruksi transfer bank demo dengan opsi upload bukti, lalu seller mengonfirmasi manual seperti QRIS.

Catatan penting: QRIS Simulation dan Bank Transfer Simulation tidak terhubung ke payment gateway asli, bukan QRIS production, dan tidak memproses uang sungguhan. Fitur ini hanya untuk MVP/demo hackathon. KampusPay Lite belum memakai Midtrans, Xendit, atau payment gateway real money lainnya.

### Order Timeline

Halaman pembayaran menampilkan timeline progres invoice. Untuk Solana, timeline menunjukkan invoice dibuat, transaksi wallet dikirim, dan pembayaran terkonfirmasi on-chain. Untuk QRIS/bank simulation, timeline menunjukkan pembayaran demo dikirim untuk review seller, lalu seller mengonfirmasi menjadi `Paid Demo`. Untuk Cash on Pickup, timeline menunjukkan order di-reserve dan seller menyelesaikan pembayaran saat pickup.

## Menjalankan Development Server

```bash
npm run dev
```

Setelah server berjalan, buka URL yang ditampilkan Vite, biasanya:

```text
http://localhost:5173
```

## Build Production

```bash
npm run build
```

Hasil build akan dibuat di folder `dist`.

## Preview Build

```bash
npm run preview
```

## Lint

```bash
npm run lint
```

## Alur Penggunaan

1. Buka halaman utama KampusPay Lite.
2. Hubungkan wallet Solana jika ingin otomatis memakai address sebagai penerima.
3. Masuk ke halaman Create Invoice.
4. Isi detail invoice: judul, deskripsi, nominal SOL, kategori, dan wallet penerima.
5. Setelah invoice dibuat, bagikan payment link atau QR code.
6. Pembayar membuka link invoice dan menghubungkan wallet.
7. Pembayar mengirim SOL di jaringan Devnet.
8. Invoice diperbarui menjadi paid dan transaksi dapat dicek di Solana Explorer.
9. Untuk order marketplace, order ikut berubah menjadi paid dan pickup code dibuat otomatis.
10. Student menunjukkan pickup code ke seller, lalu seller menandai order sebagai picked up.

## Struktur Folder

```text
kampuspay/
+-- public/                 # Aset publik seperti favicon dan icons
+-- src/
|   +-- assets/             # Aset gambar aplikasi
|   +-- components/         # Komponen UI seperti Navbar, WalletModal, FaucetModal
|   +-- hooks/              # Helper hook wallet
|   +-- pages/              # Halaman utama aplikasi
|   +-- utils/              # Helper Solana, Supabase storage, dan kategori
|   +-- App.jsx             # Routing utama aplikasi
|   +-- AppProviders.jsx    # Provider Solana wallet dan connection
|   +-- main.jsx            # Entry point React
+-- index.html
+-- package.json
+-- vite.config.js
```

## Route Aplikasi

- `/` - Landing page.
- `/login` - Login email/password dengan Supabase Auth.
- `/register` - Register student atau seller.
- `/marketplace` - Katalog marketplace kampus.
- `/product/:productId` - Detail produk dan checkout.
- `/create` - Form pembuatan invoice.
- `/pay/:invoiceId` - Halaman pembayaran invoice.
- `/student/dashboard` - Dashboard student.
- `/seller/dashboard` - Dashboard seller.
- `/seller/products` - Produk seller.
- `/seller/products/create` - Form tambah produk seller.
- `/seller/orders` - Order seller.
- `/dashboard` - Redirect ke dashboard sesuai role.
- `/legacy/dashboard` - Dashboard invoice lama.

## Penyimpanan Data

Data marketplace disimpan di Supabase pada table:

- `profiles`
- `sellers`
- `products`
- `invoices`
- `orders`

Kolom order marketplace juga menyimpan `pickup_code` dan `pickup_status` untuk proses pengambilan barang.

Kolom pembayaran multi-metode pada `invoices` dan `orders`:

- `payment_method` - `solana`, `qris`, `cash_on_pickup`, atau `bank_transfer`.
- `payment_proof_url` - URL bukti pembayaran opsional untuk QRIS/bank simulation.
- `fiat_amount` dan `fiat_currency` - estimasi nominal IDR demo.
- `payment_note` - catatan status pembayaran manual/demo.

Bucket Supabase Storage `payment-proofs` dipakai untuk bukti pembayaran QRIS/bank simulation jika student mengunggah gambar.

Faucet cooldown/history tetap disimpan lokal di browser karena hanya dipakai sebagai state UI per wallet.

## Integrasi Solana

Aplikasi memakai jaringan:

```text
Solana Devnet
```

Transaksi dikirim dengan `SystemProgram.transfer` dari `@solana/web3.js`. Setelah transaksi berhasil, invoice diperbarui dengan:

- `status: paid`
- `paymentMethod: solana`
- `txSignature`
- `paidAt`
- `paidBy`
- `buyerWallet`

Jika invoice berasal dari marketplace, order terkait juga diperbarui dengan:

- `status: paid`
- `paymentMethod: solana`
- `pickupCode`
- `pickupStatus: waiting_pickup`
- `paidAt`
- `buyerWallet`

Link Explorer dibuat dengan format Devnet agar transaksi bisa diverifikasi secara publik.

## Script npm

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan development server |
| `npm run build` | Membuat build production |
| `npm run preview` | Menjalankan preview hasil build |
| `npm run lint` | Menjalankan ESLint |

## Catatan Pengembangan

- File `.env` wajib diisi dengan kredensial Supabase sebelum aplikasi bisa menyimpan/membaca invoice dan marketplace.
- Konfigurasi Solana endpoint berada di `src/AppProviders.jsx` dan `src/utils/solana.js`.
- Polyfill Node untuk browser dikonfigurasi di `vite.config.js` agar library Solana berjalan stabil di Vite.
- Wallet adapter memakai wallet yang tersedia di browser melalui Solana wallet standard.

## Lisensi

Belum ada lisensi eksplisit di repository ini. Tambahkan file `LICENSE` jika proyek akan dipublikasikan atau digunakan oleh pihak lain.
