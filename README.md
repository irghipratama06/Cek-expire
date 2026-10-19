# Warung Expired — Kelola Stok, Cegah Kerugian
PWA offline untuk warung kecil. Tanpa login, server, atau biaya. Data disimpan di HP (IndexedDB).

## Menjalankan di komputer
Service Worker butuh http(s), jadi jangan buka file langsung. Di folder ini jalankan: `python3 -m http.server 8080`, lalu buka http://localhost:8080.

## Uji logika
`node test.js` (menguji status tanggal, stok tidak negatif, batch terpisah, hitungan kerugian, validasi backup).

## Upload ke GitHub (dari HP)
1. Ekstrak ZIP di aplikasi File. 2. Di github.com buat repo baru. 3. Pilih "Add file > Upload files", unggah SEMUA file (index.html, style.css, app.js, core.js, db.js, sw.js, manifest.json, icon-192.png, icon-512.png, README.md, test.js), lalu Commit.

## Deploy
- Vercel: vercel.com > Add New Project > pilih repo > Deploy (tanpa pengaturan tambahan).
- GitHub Pages: Settings > Pages > Branch main, folder /(root).

## Pasang di layar utama
Buka URL di Chrome Android > menu ⋮ > "Instal aplikasi" / "Tambahkan ke layar utama".

## Uji fitur
- Offline: buka aplikasi sekali online, aktifkan mode pesawat, buka ulang; tambah data, muat ulang, data tetap ada.
- Barcode: menu Scan > izinkan kamera. Memakai BarcodeDetector bawaan Chrome Android; jika tidak ada, ketik manual.
- Pengingat: Backup & Pengaturan > Isi Data Demo > lihat menu Pengingat; aktifkan notifikasi (hanya muncul saat aplikasi dibuka).
- Backup: Backup JSON, hapus data, lalu Pulihkan dari file tadi.

## Keterbatasan
Notifikasi saat aplikasi tertutup butuh Push + server (belum ada). Pemindai barcode bergantung dukungan browser (tidak ada di iOS Safari/Firefox; pakai input manual).
