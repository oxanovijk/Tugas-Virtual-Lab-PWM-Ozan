# Parabola — Virtual Lab Fisika

Media pembelajaran interaktif tentang gerak parabola untuk Fisika Dasar TPB ITB. Seluruh aplikasi berjalan di browser menggunakan HTML5, CSS, dan JavaScript murni, termasuk ketika dibuka tanpa koneksi internet.

## Menjalankan

Buka `index.html` di browser modern. Tidak diperlukan instalasi atau proses build.

Opsional, jalankan server lokal dari direktori repositori:

```sh
python -m http.server 4173
```

Kemudian buka `http://localhost:4173`.

## Fitur

- Canvas HTML5 dengan grafik koordinat, lintasan prediksi, titik puncak, dan animasi proyektil.
- Pengaturan kecepatan awal (5–50 m/s), sudut (0–90°), ketinggian awal (0–30 m), serta gravitasi Bumi, Bulan, dan Mars.
- Peluncuran, jeda, pengulangan, kecepatan animasi, dan penggeseran waktu.
- Vektor kecepatan horizontal dan vertikal serta data posisi dan kecepatan langsung.
- Perhitungan jangkauan, tinggi maksimum, dan waktu terbang secara analitik.
- Penyimpanan maksimal 50 percobaan, perbandingan enam lintasan terakhir, penghapusan percobaan, dan ekspor CSV.
- Panduan teori, misi target 60 m, serta tiga pertanyaan konsep dengan umpan balik.
- Jurnal eksperimen melalui localStorage dan unduhan teks.
- Layout responsif, navigasi keyboard, semantic HTML, label kontrol, dan notifikasi yang dapat dibaca pembaca layar.

## Model fisika

Model mengabaikan hambatan udara dan mengasumsikan gravitasi seragam, tanah datar, serta proyektil sebagai partikel. Satuan yang digunakan adalah SI.

```text
vx = v0 cos(theta)
vy(t) = v0 sin(theta) - g t
x(t) = vx t
y(t) = h0 + v0 sin(theta) t - 0.5 g t²
T = (v0 sin(theta) + sqrt((v0 sin(theta))² + 2 g h0)) / g
R = vx T
H = h0 + (v0 sin(theta))² / (2 g)
```

Solusi waktu terbang memperhitungkan ketinggian awal. Rumus jangkauan sederhana `v0² sin(2 theta)/g` hanya berlaku ketika `h0 = 0`. Simulasi berhenti ketika proyektil mencapai tanah. Sudut 0° dari tanah menghasilkan waktu terbang nol; sudut 90° menghasilkan gerak vertikal.

## Pengujian

Jalankan pemeriksaan numerik dengan Node.js, tanpa dependensi:

```sh
node tests/physics.test.cjs
```

Pengujian mencakup solusi analitik, tumbukan dengan tanah, puncak, sudut komplementer, ketinggian awal, gravitasi, sudut vertikal, serta validasi parameter.

Pemeriksaan browser opsional tersedia di `tests/browser.cjs` untuk lingkungan yang sudah memiliki Playwright dan Chromium. Jalankan server lokal, lalu `node tests/browser.cjs`. Jika menggunakan Chrome/Edge yang terpasang, isi variabel lingkungan `PARABOLA_BROWSER` dengan lokasi executable browser. Pemeriksaan ini mencakup kontrol, persistensi, ekspor, kuis, misi, layout mobile, dan akses file offline; juga menghasilkan screenshot.

## Struktur

```text
index.html              Halaman dan elemen semantik
styles.css              Desain dan responsive layout
physics.js              Perhitungan fisika
app.js                  Canvas, animasi, kontrol, penyimpanan, kuis
assets/                 Font lokal, lisensi font, favicon
tests/physics.test.cjs   Pemeriksaan numerik
screenshots/            Screenshot desktop dan mobile
```

Font Plus Jakarta Sans disertakan dengan lisensi SIL Open Font License; lihat `assets/OFL.txt`.

## Deskripsi singkat untuk pengumpulan

**Parabola** adalah virtual lab berbasis web untuk mempelajari gerak parabola. Pengguna dapat mengubah kecepatan awal, sudut peluncuran, ketinggian awal, dan gravitasi, lalu mengamati animasi lintasan, vektor kecepatan, serta perubahan posisi secara langsung. Lab menyediakan perbandingan percobaan, ekspor data CSV, panduan teori, tantangan target, kuis konsep, dan catatan eksperimen. Aplikasi dibuat sepenuhnya dengan HTML5, CSS, dan JavaScript dan berjalan di sisi browser.

## Penerbitan untuk pengumpulan

1. Commit dan push source code ke repositori GitHub milikmu.
2. Pada Settings → Pages, pilih Deploy from a branch, branch `main`, direktori `/ (root)`, lalu Save.
3. Setelah deployment berhasil, gunakan URL yang ditampilkan GitHub Pages.
4. Kumpulkan link website, link repositori, screenshot di folder `screenshots`, serta deskripsi singkat di Google Drive sesuai instruksi dosen.

Data percobaan dan catatan tersimpan di browser dan origin yang digunakan; ekspor jika ingin memindahkannya ke perangkat atau alamat web lain.
