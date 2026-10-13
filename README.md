# ⛰️ Pendaki Nusantara — 2D Side-Scrolling Idle Hiking Game

Game simulasi pendakian gunung bernuansa Indonesia dengan grafis procedural Canvas 2D, sistem multi-layer parallax scrolling, serta siklus siang/malam dan cuaca tropis dinamis.

---

## 🌟 Fitur Utama

1. **Parallax Background Berlapis-Lapis**:
   - Langit gradasi siang-malam dengan pergerakan matahari, bulan sabit, & bintang-bintang berkelap-kelip.
   - Lapisan awan berkecepatan berbeda & lautan awan (*sea of clouds*) di ketinggian > 2.300 mdpl.
   - Puncak gunung megah di kejauhan dengan kepulan asap kawah vulkanik dinamis (misal di Semeru & Papandayan).
   - Deretan bukit berlayer dengan vegetasi menyesuaikan ketinggian bioma.
   - Tanah berpola kontur, jalur pendakian setapak, bebatuan, rumput, dan bunga edelweis.

2. **Gunung-Gunung Populer Indonesia**:
   - **Gunung Papandayan** (2.665 mdpl - Kawah, Hutan Mati, Tegal Alun)
   - **Gunung Gede** (2.958 mdpl - Cibodas, Air Panas, Kandang Badak)
   - **Gunung Merbabu** (3.142 mdpl - Sabana & pemandangan Merapi)
   - **Gunung Semeru** (3.676 mdpl - Ranu Kumbolo & Lautan Pasir Mahameru)
   - **Gunung Rinjani** (3.726 mdpl - Danau Segara Anak & Plawangan Sembalun)
   - **Gunung Kerinci** (3.805 mdpl - Atap Sumatra)
   - **Puncak Carstensz** (4.884 mdpl - Puncak Tertinggi Nusantara dengan salju abadi)

3. **Karakter & Animasi Hidup**:
   - Pendaki utama dengan ransel carrier, matras, trekking pole, dan animasi melangkah dinamis.
   - Tim **Porter Lokal** setia yang menemani di belakang pendaki membawa beban khas porter Indonesia.
   - Tenda dome oranye dan api unggun hangat yang menyala ketika stamina habis dan pendaki berkemah.
   - Pengibaran Bendera Merah Putih di Tugu Puncak saat mencapai puncak tertinggi.

4. **Sistem Cuaca & Atmosfer**:
   - Cuaca dinamis: Cerah, Kabut Pegunungan (*mist*), dan Hujan Gerimis Tropis (*rain*).
   - Kunang-kunang (*fireflies*) hijau bercahaya di area hutan pada malam hari.
   - Efek lampu senter kepala (*headlamp*) yang menyinari jalur setapak saat malam tiba.

5. **Efek Audio Sintetis (Web Audio API)**:
   - Dibuat mandiri dengan Web Audio API tanpa perlu unduh file audio eksternal.
   - Denting pentatonik Slendro/Gamelan santai mengiringi suasana alam.
   - Efek suara langkah kaki, tap booster semangat, berkemah, check point, hingga jingle kemenangan puncak.
   - Tombol toggle Suara (🔊 / 🔇) di pojok kiri atas HUD.

6. **Mekanisme Idle & Upgrade Lengkap**:
   - Penghasilan Rupiah otomatis tiap meter pendakian.
   - Perlengkapan: Sepatu Gunung, Carrier, Logistik & Kopi Tubruk, Trekking Pole, Jaket Gunung, Headlamp, Porter Lokal, Pemandu Lokal.
   - Event acak khas pendakian Indonesia (ketemu kera nakal, seduh kopi, salam lestari, babi hutan, dsb).
   - Progres offline otomatis saat browser ditutup.

---

## 🚀 Cara Menjalankan Game

Cukup buka file `index.html` langsung di browser modern apapun (Google Chrome, Microsoft Edge, Firefox, Safari):

```powershell
# Jalankan via terminal atau klik dua kali index.html
start index.html
```
