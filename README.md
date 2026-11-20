# Aplikasi Qurban Al-Hikmah

Aplikasi web untuk pengelolaan qurban Masjid Al-Hikmah — **frontend statis + backend & penyimpanan Firebase (Cloud Firestore)**:

- **Kalkulator Daging** — perhitungan daging per sapi, peserta, jatah, dan isi per gantingan.
- **Data Warga & Kupon** — data penerima (tambah, edit, hapus, duplikat otomatis dilewati), statistik per RT, cetak kupon qurban, daftar hadir, serta import/export data.
- **QR Code Kupon** — tiap kupon tercetak membawa QR code yang bisa dipindai untuk verifikasi penukaran daging (tandai sudah/belum tukar langsung dari kamera).
- **Backend Firestore** — data tersimpan terpusat di Cloud Firestore sehingga konsisten antar perangkat (panitia yang beda ponsel melihat data yang sama). Tanpa server sendiri: halaman memanggil Firestore lewat Firebase SDK.
- **Live Counter** — papan realtime (`live.html`) yang menampilkan jumlah warga yang sudah/belum tukar kupon, progres persen, statistik per RT, dan riwayat penukaran terbaru — cocok untuk layar/proyektor di lokasi. Tabel di halaman Data Warga juga ikut berubah otomatis saat panitia lain menandai penukaran.

## Cara Menjalankan Lokal

Layani folder `public/` dengan server statis apapun (Firestore butuh http/https, bukan `file://`):

```bash
npx serve public
# atau
python3 -m http.server 8080 --directory public
```

- `index.html` — Kalkulator Daging
- `warga.html` — Data Warga & Kupon
- `scanner.html` — Pemindai QR kupon (verifikasi penukaran)
- `live.html` — Papan counter live masih/kelola tukar kupon (realtime)

Preview penuh (hosting + Firestore lokal) juga bisa lewat emulator:

```bash
npm install -g firebase-tools
firebase login
firebase emulators:start
# buka http://localhost:5000
```

> Emulator Firestore membutuhkan Java. Aktifkan dengan `firebase init firestore` bila diminta.

## Setup Firebase (sekali)

1. Buat project di [console.firebase.google.com](https://console.firebase.google.com).
2. **Build → Firestore Database → Create database** (mode Native).
3. **Project Overview → ikon Web (</>)** → daftarkan aplikasi web → salin nilai `firebaseConfig`.
4. Tempel nilainya ke `public/assets/firebase-config.js` (ganti semua `ISI_...`).
5. Tambahkan domain deploy ke **Authentication → Settings → Authorized domains**:
   - `<project-id>.web.app` dan `<project-id>.firebaseapp.com` (biasanya sudah otomatis), serta domain kustom bila dipakai.

## Deploy ke Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # pilih project, alias "default"
firebase deploy --only hosting,firestore:rules
```

Aplikasi terbit di `https://<project-id>.web.app`.

## Sumber Data (Firestore)

- Koleksi `warga`, satu dokumen per warga: `{ nama, rt, key, noKupon, sudahTukar, waktuTukar }`.
- `waktuTukar` (timestamp ms) terisi otomatis saat panitia menandai penukaran, dan dihapus bila tandanya dibatalkan — dipakai papan Live untuk riwayat terbaru.
- `key` = `nama||rt` (huruf kecil, spasi dirapikan) untuk mendeteksi duplikat.
- Nomor kupon dialokasikan bertahap (`maks + 1`) dan tetap milik orangnya — aman untuk cetak ulang.
- Halaman yang membuka data lama dari `localStorage` akan menawarkan migrasi sekali ke Firestore.
- Fitur cetak (laporan, kupon, daftar hadir) membuka jendela/tab baru — izinkan popup. Pemindaian kamera (`scanner.html`) butuh **https** atau **localhost**.

## Keamanan

`firestore.rules` saat ini terbuka (`warga` boleh dibaca/ditulis siapa saja yang punya alamat aplikasi — setara perilaku lama). Untuk produksi bila perlu lebih ketat, tambahkan Firebase Authentication lalu alihkan rules, misalnya `allow read, write: if request.auth != null;`.

## Format Import (halaman Data Warga)

Mendukung file `.json`, `.csv`, `.xls`, dan `.xlsx`. Sheet/kolom dikenali berdasarkan nama header:

| Kolom | Header yang diterima |
| ----- | -------------------- |
| Nama  | `nama`, `nama warga`, `warga`, `penerima`, `nama lengkap` |
| RT    | `rt`, `rt/rw`, `rt rw` |

Contoh JSON:

```json
[
  { "nama": "Andi", "rt": "01" },
  { "nama": "Budi", "rt": "02" }
]
```

Saat import, pilih **timpa** (ganti semua data lama) atau **gabung** (duplikat nama + RT yang sama otomatis dilewati). Duplikat nomor kupon pada file backup otomatis diberi nomor baru.

## Backup

- Gunakan tombol **Export** untuk mengunduh seluruh data sebagai file JSON (format lengkap, siap di-import ulang).
- Gunakan tombol **Excel** untuk mengunduh daftar warga kini (.xlsx) berisi kolom No, No Kupon, Nama, RT, dan Status Tukar — untuk laporan/arsip yang mudah dibuka.
- Simpan file backup sebelum mengosongkan data. Firestore juga bisa di-backup lewat konsol Firebase (PITR/ekspor).

## QR Code Kupon

- Saat **Cetak Kupon**, QR code aktif secara default di sisi kupon. Atur melalui panel **Layout Cetak Kupon**: pilih **Nonaktif** untuk cetak tanpa QR, atau ubah **Ukuran QR (mm)**.
- QR pada kupon berisi data `QURBAN|<nomor kupon>|<id dokumen>` dan hanya bisa dibaca oleh halaman scan aplikasi ini.
- Buka halaman **📷‍ Scan QR** (`scanner.html`) untuk memindai kupon saat warga menukar daging:
  1. Tekan **Mulai Kamera**, arahkan ke QR pada kupon.
  2. Nama, RT, nomor kupon, dan status tukar akan tampil.
  3. Tekan **Tandai Sudah Tukar** (atau batalkan bila salah tanda); perubahan langsung tersimpan ke Firestore.
- Jika kamera tidak tersedia, gunakan kolom pencarian manual (nomor kupon atau nama).

## Nomor Kupon & Status Tukar

- Setiap warga mendapat nomor kupon permanen (`#001`, dst) yang tidak bergeser meski data berubah — aman untuk cetak ulang.
- Centang kolom **Tukar** di tabel saat warga menukar kuponnya; kartu **Tukar Kupon** di panel statistik menampilkan ringkasan `sudah/total`.

## Struktur

```
firebase.json                 Konfigurasi Firebase Hosting (+ referensi rules)
firestore.rules               Aturan keamanan Firestore
public/
index.html                    Kalkulator daging qurban
warga.html                    Data penerima, kupon, daftar hadir
scanner.html                  Verifikasi tukar kupon lewat scan QR
live.html                     Papan counter live realtime (layar/proyektor)
assets/style.css              Style bersama antar halaman (header, panel, tombol, tabel, statistik)
assets/firebase-config.js     Konfigurasi project Firebase (diisi pengguna)
assets/store.js               Lapisan penyimpanan Firestore (CRUD, import, kupon, listener realtime)
assets/xlsx.full.min.js       SheetJS 0.20.3 (CDN SheetJS, untuk import CSV/Excel)
assets/qrcode.min.js          qrcode-generator 1.4.4 (pembuat QR pada kupon)
assets/jsQR.min.js            jsQR 1.4.0 (decoder QR kamera di halaman scan)
```
