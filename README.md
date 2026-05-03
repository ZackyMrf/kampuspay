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

Faucet cooldown/history tetap disimpan lokal di browser karena hanya dipakai sebagai state UI per wallet.

## Integrasi Solana

Aplikasi memakai jaringan:

```text
Solana Devnet
```

Transaksi dikirim dengan `SystemProgram.transfer` dari `@solana/web3.js`. Setelah transaksi berhasil, invoice diperbarui dengan:

- `status: paid`
- `txSignature`
- `paidAt`
- `paidBy`

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
