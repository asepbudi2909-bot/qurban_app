# Aplikasi Qurban Al-Hikmah

Aplikasi statis (HTML murni, tanpa backend) untuk pengelolaan qurban Masjid Al-Hikmah:

- **Kalkulator Daging** — perhitungan daging per sapi, peserta, jatah, dan isi per gantingan.
- **Data Warga & Kupon** — data penerima (tambah, edit, hapus, duplikat otomatis dilewati), statistik per RT, cetak kupon qurban, daftar hadir, serta import/export data.

## Cara Menjalankan

Buka salah satu halaman:

- `index.html` — Kalkulator Daging
- `warga.html` — Data Warga & Kupon (menuju halaman ini juga bisa dari tombol navigasi)

Tidak ada proses build. Data tersimpan otomatis di `localStorage` browser. Pastikan kedua halaman diakses dari alamat/asal yang sama sehingga data tetap tersimpan.

> Fitur cetak (laporan, kupon, daftar hadir) membuka jendela/tab baru. Izinkan popup untuk halaman ini.

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

Saat import, pilih **timpa** (ganti semua data lama) atau **gabung** (duplikat nama + RT yang sama otomatis dilewati).

## Backup

- Gunakan tombol **Export** untuk mengunduh seluruh data sebagai file JSON (format lengkap, siap di-import ulang).
- Gunakan tombol **Excel** untuk mengunduh daftar warga kini (.xlsx) berisi kolom No, No Kupon, Nama, RT, dan Status Tukar — untuk laporan/arsip yang mudah dibuka.
- Simpan file backup sebelum menghapus data atau mengganti perangkat.

## Nomor Kupon & Status Tukar

- Setiap warga mendapat nomor kupon permanen (`#001`, dst) yang tidak bergeser meski data berubah — aman untuk cetak ulang.
- Centang kolom **Tukar** di tabel saat warga menukar kuponnya; kartu **Tukar Kupon** di panel statistik menampilkan ringkasan `sudah/total`.

## Struktur

```
index.html              Kalkulator daging qurban
warga.html              Data penerima, kupon, daftar hadir
assets/style.css        Style bersama antar halaman (header, panel, tombol, tabel, statistik)
assets/xlsx.full.min.js SheetJS 0.20.3 (CDN SheetJS, untuk import CSV/Excel)
```
