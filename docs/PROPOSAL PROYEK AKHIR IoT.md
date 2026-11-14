**PROPOSAL PROYEK AKHIR**  
**INTERNET OF THINGS**

Perancangan Sistem Unggulan Pengelolaan dan Monitoring Sampah (Sugeng) Berbasis *Internet of Things* (IoT) dan Algoritma *Capacitated Vehicle Routing Problem* (CVRP) untuk Mengatasi Krisis Persampahan Perkotaan 

![][image1]

Disusun Oleh :

1. Farrel Apriandry Ciu (2430506056)  
2. Nabila Syafiqah Zahran Firlina (2430506058)

Dosen Pengampu:  
Muhamad Maksum Hidayat, S.Kom., M.Kom.

**PROGRAM STUDI S-1 TEKNOLOGI INFORMASI**  
**FAKULTAS TEKNIK**  
**UNIVERSITAS TIDAR**  
**2026**  
HALAMAN PENGESAHAN  
PROPOSAL PROYEK AKHIR MATA KULIAH  
INTERNET OF THINGS

Judul Proyek Akhir	: Perancangan Sistem Unggulan Pengelolaan dan Monitoring Sampah (Sugeng) Berbasis Internet of Things (IoT) dan Algoritma Capacitated Vehicle Routing Problem (CVRP) untuk Mengatasi Krisis Persampahan Perkotaan   
Mata Kuliah		: Internet of Things  
Program Studi		: S-1 Teknologi Informasi  
Fakultas		: Teknik  
Tahun Akademik	: 2026/2027  
Anggota Tim Pengusul :

1. Ketua Tim  
1. Nama Lengkap	: Farrel Apriandry Ciu  
2. NPM			: 2430506056  
3. Program Studi	: S-1 Teknologi Informasi  
2. Anggota  
1. Nama Lengkap	: Nabila Syafiqah Zahran Firlina  
2. NPM			: 2430506058  
3. Program Studi	: S-1 Teknologi Informasi

Rencana Anggaran Biaya (RAB)	: Rp990.453,00  
Jangka Waktu Pengerjaan		: 10 Minggu  
Magelang, 4 September 2026  
Menyetujui,  
Dosen Pengampu					Ketua Tim Pengusul

Muhamad Maksum Hidayat, S.Kom., M.Kom	Farrel Apriandry Ciu  
NIP. 199506302025061003				NPM. 2430506056  
Mengetahui  
Koordinator Program Studi

Restu Rakhmawati, S.Kom., M.Kom  
NIP. 199403062022032015

# **BAB I**

# **PENDAHULUAN**

1. ## **Latar Belakang**

Tata kelola persampahan perkotaan yang berkelanjutan merupakan salah satu pilar utama dalam mewujudkan ekosistem *smart city* yang bersih, sehat, dan ramah lingkungan. Pertumbuhan jumlah penduduk dan peningkatan aktivitas ekonomi di wilayah perkotaan secara berbanding lurus mendorong perlunya efisiensi sistem pengelolaan limbah padat, mulai dari penampungan sementara di tingkat hulu hingga pemrosesan di hilir. Dalam kondisi ideal, pengangkutan sampah dari Tempat Penampungan Sementara (TPS) menuju Tempat Pemrosesan Akhir (TPSA) harus terintegrasi dengan baik melalui penjadwalan armada yang terukur, tepat waktu, serta berbasis data volume yang akurat guna mencegah penumpukan limbah di area pemukiman warga.

Namun, kondisi riil di lapangan menunjukkan bahwa sistem pengelolaan sampah di Kota Magelang menghadapi krisis kapasitas mendesak, khususnya pada TPSA Banyuurip yang telah mengalami kondisi kelebihan beban (*overload*). Fasilitas yang beroperasi sejak tahun 1995 ini telah melampaui usia operasional idealnya dan diproyeksikan hanya mampu bertahan hingga tahun 2028 dengan pasokan buangan harian mencapai 65 hingga 76 ton sampah. Masalah ini diperparah oleh pola pengangkutan sampah konvensional yang masih bergantung pada pemantauan manual dan jadwal rute statis tanpa adanya informasi kepenuhan secara *real-time*. Akibatnya, sering terjadi keterlambatan penanganan pada TPS yang meluap (*overflow*), yang memicu penumpukan sampah berlebih, timbulnya emisi bau busuk dari pembusukan organik, risiko pencemaran air tanah akibat cairan lindi (*leachate*), hingga ketidakefisienan konsumsi bahan bakar armada pengangkut.

Metode pemantauan manual dan penjadwalan konvensional terbukti tidak lagi memadai untuk merespons dinamika laju akumulasi sampah perkotaan yang fluktuatif. Guna menjembatani batasan tersebut, implementasi teknologi *Internet of Things* (IoT) hadir sebagai solusi terintegrasi yang efisien dan presisi. Dengan memanfaatkan mikrokontroler ESP32 sebagai unit pemroses utama dan sensor ultrasonik kedap air (JSN-SR04T) yang dipasang pada tiap *bin* TPS, volume kepenuhan sampah dapat diukur secara akurat dalam berbagai kondisi cuaca. Data *telemetry* tersebut kemudian ditransmisikan secara nirkabel menuju platform *cloud* untuk diolah lebih lanjut menggunakan algoritma analisis, sehingga menghasilkan informasi status kepenuhan serta rekomendasi rute penjemputan armada yang optimum bagi petugas lapangan.

Berdasarkan latar belakang permasalahan di atas, proyek ini mengusulkan pengembangan **Sistem Unggulan Pengelolaan dan Monitoring Sampah (Sugeng)** berbasis mikrokontroler ESP32 dan sensor JSN-SR04T. Penelitian ini bertujuan untuk merancang dan mengimplementasikan sistem monitoring volume sampah berbasis IoT yang responsif serta terintegrasi dengan platform web, guna mewujudkan efisiensi operasional tata kelola persampahan perkotaan yang adaptif dan berkelanjutan.

2. ## **Rumusan Masalah**

Berdasarkan latar belakang yang telah dipaparkan, rumusan masalah dalam penelitian ini adalah sebagai berikut: 

1. Bagaimana merancang dan merangkai sistem fisik (*hardware*) node *smart bin* berbasis mikrokontroler ESP32 DevKit V1 yang terhubung dengan sensor ultrasonik kedap air (JSN-SR04T) dan sensor gas (MQ-135) untuk mendeteksi tingkat kepenuhan serta indikator pembusukan sampah?   
2. Bagaimana mengimplementasikan protokol komunikasi data (MQTT/HTTP REST API) untuk mentransmisikan data *telemetry* dari mikrokontroler ESP32 ke platform *web dashboard* secara efisien dan *real-time*?  
3. Bagaimana tingkat akurasi pembacaan jarak sensor JSN-SR04T serta keandalan transmisi data pada sistem Sugeng dalam pengujian pemantauan volume sampah secara *real-time*? 

   3. ## **Tujuan Proyek**

Adapun tujuan yang ingin dicapai dalam perancangan dan implementasi proyek Sugeng ini adalah sebagai berikut: 

1. Merancang arsitektur perangkat keras node *smart bin* berbasis mikrokontroler ESP32 DevKit V1 yang mengintegrasikan sensor ultrasonik kedap air (JSN-SR04T) untuk pengisian volume, sensor gas (MQ-135) untuk deteksi bau pembusukan, serta modul pengisian daya tenaga surya (CN3065).  
2. Mengimplementasikan sistem komunikasi data *real-time* menggunakan protokol komunikasi \[MQTT / HTTP REST API\] dari mikrokontroler ESP32 menuju platform *web dashboard* custom yang dibangun menggunakan FastAPI dan basis data Supabase (PostgreSQL \+ PostGIS).  
3. Menganalisis tingkat akurasi pembacaan jarak sensor JSN-SR04T terhadap volume tumpukan sampah serta keandalan *delay* transmisi data *telemetry* pada kondisi operasional TPS secara *real-time*.

   4. ## **Manfaat Proyek**

Manfaat yang diharapkan dapat diperoleh dari perancangan dan implementasi proyek akhir Sugeng ini terbagi menjadi dua aspek utama, yaitu:

1. **Manfaat Akademis (Teoritis)**

1. **Pengembangan Keilmuan IoT dan Sistem Terintegrasi**: Mengembangkan dan memperkaya referensi ilmiah terkait penerapan teknologi *Internet of Things* (IoT) pada sektor tata kelola lingkungan (*smart waste management*), khususnya dalam penggabungan *sensor fusion* (sensor jarak kedap air JSN-SR04T dan sensor gas MQ-135) dengan arsitektur *cloud* berbasis FastAPI dan Supabase PostGIS.  
2. **Penerapan Konsep Smart City secara Aksesibel**: Menjadi rujukan studi bagi mahasiswa Program Studi S-1 Teknologi Informasi Universitas Tidar dalam mengimplementasikan integrasi sistem tertanam (*embedded system*), protokol transmisi data *real-time*, dan visualisasi data spasial (GIS) pada permasalahan nyata masyarakat perkotaan.  
3. **Validasi Model Pemantauan Telemetri Lapangan**: Memberikan data empiris mengenai tingkat akurasi pembacaan sensor ultrasonik kedap air pada media padat yang tidak rata (tumpukan sampah) serta keandalan transmisi data nirkabel dalam kondisi operasional lingkungan luar ruangan (*outdoor*).

2. **Manfaat Praktis (Penerapan)**

1. **Bagi Dinas Lingkungan Hidup (DLH) Kota Magelang dan Pengelola TPS:**  
   * **Efisiensi Biaya dan Operasional:** Membantu mentransformasi sistem pengangkutan sampah dari metode konvensional berbasis jadwal statis menjadi sistem adaptif berbasis status kepenuhan *real-time*, sehingga dapat menghemat konsumsi bahan bakar minyak (BBM) dan waktu tempuh armada pengangkut.  
   * **Pengambilan Keputusan Berbasis Data Spasial:** Menyediakan dasbor analitik geospasial terpadu untuk memetakan TPS prioritas, memantau laju akumulasi sampah harian, dan memitigasi krisis penumpukan limbah sebelum sampai ke TPSA Banyuurip.  
2. **Bagi Petugas Pengangkut Sampah:**  
   * Memudahkan koordinasi penjemputan sampah melalui notifikasi dan indikator tingkat kepenuhan TPS secara *real-time*, sehingga efisiensi kerja petugas di lapangan dapat meningkat tanpa perlu melakukan pengecekan TPS secara manual satu per satu.  
3. **Bagi Masyarakat Kota Magelang:**  
   * Mencegah timbulnya penumpukan sampah berlebih (*overflow*) di lingkungan pemukiman, mengurangi emisi bau busuk akibat pembusukan organik yang terdeteksi dini oleh sensor gas, serta meminimalkan risiko pencemaran lingkungan dan potensi penyakit di sekitar kawasan TPS.

# **BAB II**

# **TINJAUAN PUSTAKA & DASAR TEORI**

1. ##  **Penelitian Terkait (*State of The Art)***

Pemetaan posisi penelitian (*State of the Art*) dilakukan dengan menelaah beberapa studi terdahulu yang memiliki keterkaitan tema, khususnya pada penerapan arsitektur IoT dan metode komputasi. Rangkuman studi literatur beserta perbedaannya dengan penelitian yang diusulkan dirangkum dalam Tabel 2.1.

**Tabel 2.1** *Penelitian Terkait*

| No | Peneliti & Tahun | Judul Penelitian | Metode & Arsitektur IoT | Hasil Utama | Perbedaan |
| ----- | ----- | ----- | ----- | ----- | ----- |
| 1\. | Witsar Rafi'udin, Afifah Dwi Ramadhani, dan Norma Ningsih (2026). | Sistem Manajemen Pengambilan Sampah Pintar Menggunakan Metode Fuzzy | **Metode Utama:** Fuzzy Logic Mamdani untuk mengklasifikasikan tingkat prioritas pengangkutan (*Low*, *Medium*, *High Priority*) berdasarkan input kadar gas, ketinggian tumpukan, dan jarak lokasi.  **Arsitektur IoT:** ESP32, Sensor Ultrasonik HC-SR04, Sensor Gas MQ-136, dan Modul GPS Neo-6M. Menggunakan protokol MQTT yang meneruskan data dari node ke database server pada Local PC. Terdapat dashboard web untuk menampilkan Raw Data sensor, titik lokasi TPS pada peta, dan urutan prioritas rute. | Akurasi sensor ultrasonik mencapai 97% (rata-rata error 2,82%). Akurasi simulasi ruleset fuzzy pada MATLAB sebesar 95%.  Rata-rata error lokasi GPS sebesar 3,77 meter.  Modul GPS tidak berfungsi di ruang tertutup, sehingga mengganggu fitur peta dan optimasi rute pada website. | Sistem Sugeng berfokus pada pemetaan rute navigasi armada truk secara langsung berbasis CVRP/OR-Tools, memanfaatkan sensor *waterproof* JSN-SR04T dan MQ-135/MQ-4, disokong daya mandiri *Solar Power* (*Deep Sleep*), serta *backend* FastAPI/PostGIS.  |
| 2\. | Rosmita, Heliawati Hamrul, dan Musawwir. (2026). | SISTEM MONITORING TEMPAT SAMPAH PINTAR DI KAMPUS UNIVERSITAS SULAWESI BARAT BERBASIS IOT DENGAN ALGORITMA FUZZY LOGIC | **Metode Penelitian:** *Research and Development* (R\&D) / Rancang Bangun Prototipe.  **Metode Keputusan:** Fuzzy Logic (Fuzzifikasi, Inferensi *Rule Base*, dan Defuzzifikasi) untuk mengelompokkan status tempat sampah berdasarkan kombinasi masukan sensor.  **Arsitektur IoT:** Sensor Ultrasonik HC-SR04, Sensor Gas MQ-135, dan Sensor DHT22. Mikrokontroler ESP32 digunakan untuk memproses firmware C++ via Arduino IDE dan mengeksekusi algoritma Fuzzy Logic. Koneksi Wi-Fi pada ESP32 mentransmisikan pesan dan alert kondisi kritis secara real-time ke Telegram Bot (Telegram API) untuk petugas kebersihan kampus. | Kinerja Sensor Ultrasonik (HC-SR04): mampu membaca jarak secara presisi. Kinerja Sensor Gas (MQ-135): responsif terhadap intensitas pembusukan. Kinerja Sensor DHT22: Mampu membaca kondisi lingkungan dengan stabil. Integrasi Sistem & Notifikasi: Algoritma Fuzzy Logic berhasil mengolah multi-input sensor menjadi status keputusan tunggal dan berhasil mengirimkan notifikasi pop-up otomatis ke Telegram saat tempat sampah penuh, berbau, atau bersuhu panas. | Sistem Sugeng berfokus pada optimasi dan pemetaan rute pengangkutan armada truk sampah perkotaan berbasis CVRP/OR-Tools via dashboard SIG (FastAPI/PostGIS), memanfaatkan sensor *waterproof* JSN-SR04T, sensor gas pembusukan MQ-135/MQ-4, serta disokong daya mandiri *Solar Power System* (*Deep Sleep*).  |
| 3\. | Nendy Akbar Rozaq Rais dan Siti Rokhmah. (2025). | SMART COMPOSTING SYSTEM: INOVASI IOT UNTUK PENGOLAHAN DAN PEMANTAUAN SAMPAH ORGANIK RUMAH TANGGA | **Metode Penelitian:** Rancang bangun komposter pintar (*Smart Composting Bin*) berbasis eksperimental dengan otomatisasi kontrol kelembapan media kompos. Sistem menyalakan pompa penyiram air otomatis saat kelembapan tanah/kompos di bawah 40% dan memberikan notifikasi saat kelembaban melebihi 60%. **Arsitektur IoT:** Sensor DHT22, Sensor YL-69, Sensor Gas MQ-135. Mikrokontroler ESP32 sebagai unit pemroses yang terhubung ke relay pengendali pompa air. Transmisi data via jaringan Wi-Fi ke platform Blynk Cloud untuk pemantauan real-time dan notifikasi di aplikasi.  | Sistem berhasil menjaga kondisi suhu internal kompos pada fase termofilik dan kelembapan kompos pada rentang ideal. Latensi pengiriman data dari node ke Blynk Cloud berada di bawah 2 detik, dengan response time penyiraman pompa air otomatis sebesar 2 detik. | Sistem Sugeng berfokus pada pemantauan TPS (volume & gas bau) menggunakan daya surya mandiri dan dashboard SIG (FastAPI/PostGIS).  |
| 4\. | Ok Muhammad Ihsan, M Irfan Aldy Nasution, Wiwi Verina, dan Bagus Nugraha. (2025). | Pengembangan Aplikasi Mobile IoT untuk Meningkatkan Partisipasi Masyarakat dalam Pengelolaan Sampah Berkelanjutan Berbasis Android | **Metode Penelitian:** *Research and Development* (R\&D) menggunakan pendekatan *prototyping*. Sistem diuji coba secara fungsional di dua lingkungan sosial berbeda: sekolah (SMK Swasta Perguruan Mabar) dan permukiman warga (Lingkungan II Mabar).  **Arsitektur IoT:** Mikrokontroler ESP32, 2x Sensor Ultrasonik JSN-SR04T (deteksi volume tong organik dan anorganik), 2x Servo Motor MG996R (mekanisme buka-tutup otomatis), Modul DFPlayer Mini \+ Speaker (umpan balik suara/audio), LCD I2C, Tombol Manual, serta subsistem daya mandiri (Panel Surya 50Wp, Baterai AGM 12V 9Ah, dan Converter Step-Down 5A). **Cloud Service Layer:** *Firebase Authentication* untuk keamanan akun dan *Firebase Realtime Database* untuk pencatatan poin serta riwayat transaksi secara *real-time*.  **End-User Layer:** Aplikasi *Mobile Cross-Platform* berbasis Flutter yang dilengkapi fitur *Scan QR Code*, sistem poin reward, *leaderboard*, *history log*, dan penukaran pulsa/saldo e-wallet.  | Tingkat Keberhasilan Sistem: Rata-rata tingkat keberhasilan gabungan seluruh fitur mencapai 96,8%.  Perbandingan Lingkungan: Tingkat keberhasilan di lingkungan sekolah mencapai 98,4%, sedangkan di permukiman sebesar 95,0%.  Fitur Terandal: Autentikasi akun, *Audio Feedback*, pencatatan *History Log*, dan *Leaderboard* beroperasi sempurna dengan tingkat keberhasilan 100%.  | Sistem Sugeng bekerja pasif-otomatis tanpa interaksi warga untuk memetakan rute truk armada (CVRP) bagi dinas kebersihan.  |
| 5\. | Shuotong Su, Jiawen Hu, Wenjun Li, Domokos Esztergár-Kiss, dan Tuqiang Zhou. (2025). | A flexible waste bin number allocation plan applied to waste transportation electric fleets in smart cities | **Metode Penelitian:** Pengoperasian armada truk listrik (*Multiple Types of Single-Compartment Electric Vehicles* / MTSCEVs) dengan pemodelan optimasi bi-objektif (*bi-objective optimization model*). Pemodelan ini menggabungkan alokasi jumlah tempat sampah dinamis/fleksibel (**DN-Bins plan**) yang diselesaikan menggunakan algoritma evolusioner **Improved NSGA-II** (*Non-dominated Sorting Genetic Algorithm II*) serta *Entropy Weighting Method* untuk menentukan rute pengangkutan optimal dari set solusi Pareto.  **Arsitektur IoT (Smart City Framework):** Tempat sampah pintar berbasis sensor ultrasonik dan modul penimbangan bobot. Transmisi data telemetri secara berkala/real-time ke platform cloud (*smart cloud platform*). *Waste Transportation Intelligence Platform* terintegrasi GIS (QGIS) yang memantau status *overflow*, menghitung akumulasi volume/bobot sampah harian, memformulasi tugas pengangkutan, serta merencanakan rute efisien armada truk listrik.  | Penerapan metode *DN-Bins* berhasil memangkas biaya operasional harian (*operating costs*) secara signifikan, dengan penghematan hingga ¥5,13 juta (RMB) dalam jangka waktu 3 tahun di 10 distrik uji coba (Huancui District, Weihai City, Cina).  Seluruh investasi penambahan unit tempat sampah pintar (*DN-Bins*) di 10 distrik berhasil balik modal (*payback cycle*) dalam waktu kurang dari 300 hari.  | Sistem Sugeng berfokus pada efisiensi telemetri IoT berdaya surya dan pencarian rute berbasis tingkat kepenuhan serta kadar gas pembusukan.  |

2. ## **Landasan Teori** 

   1. **Internet of Things (IoT)**

   *Internet of Things* (IoT) merupakan paradigma komputasi yang menghubungkan objek atau perangkat fisik ke jaringan internet, sehingga mampu melakukan pengumpulan, pertukaran, dan pemrosesan data secara otomatis tanpa interaksi langsung manusia ke manusia. Arsitektur IoT secara umum terbagi menjadi beberapa lapisan (*layers*):

> > > 1. **Perception Layer:** Mengumpulkan data fisik lingkungan menggunakan sensor dan aktuator.  
> > > 2. **Network Layer:** Mentransmisikan data telemetry melalui media transmisi nirkabel (Wi-Fi, Cellular, LoRaWAN) menggunakan protokol jaringan.  
> > > 3. **Processing & Application Layer** Mengolah data pada *cloud/server* untuk disimpan, dianalisis menggunakan algoritma kecerdasan buatan, dan divisualisasikan pada antarmuka pengguna (*web/mobile dashboard*).

   2. **Mikrokontroler ESP32**

   ESP32 adalah mikrokontroler berbasis System-on-Chip (SoC) buatan Espressif Systems yang dilengkapi dengan prosesor Tensilica Xtensa 32-bit dual-core, modul komunikasi Wi-Fi (802.11 b/g/n), dan Bluetooth v4.2 BR/EDR & BLE. Mikrokontroler ini beroperasi pada tegangan logika 3.3V dan memiliki pin General Purpose Input/Output (GPIO) yang mendukung pemrosesan sinyal analog melalui Analog-to-Digital Converter (ADC) serta komunikasi antarmuka seperti I2C, SPI, dan UART.

   Salah satu fitur krusial ESP32 untuk aplikasi outdoor berbasis baterai adalah modus penghematan daya Deep Sleep. Pada mode ini, sebagian besar blok daya dan CPU dimatikan, menyisakan konsumsi arus skala mikroampere (μA), sementara Ultra Low Power (ULP) co-processor atau RTC timer tetap aktif untuk membangunkan sistem secara berkala.

      3. **Sensor Ultrasonik Kedap Air (JSN-SR04T)**

   Sensor JSN-SR04T adalah modul pengukur jarak non-kontak berbasis gelombang akustik berfrekuensi tinggi (40 kHz) yang dirancang khusus untuk lingkungan luar ruangan (outdoor) dan lembap. Berbeda dengan sensor ultrasonik HC-SR04 konvensional, JSN-SR04T menggunakan single waterproof transducer berperekat kedap air berstandar IP67.

   Prinsip kerja pengukuran jarak berbasis waktu tempuh gelombang (Time of Flight / ToF) dirumuskan sebagai berikut:

$s\ =\frac{v\ x\ t}{2}{\ }$

* *s* \= Jarak antara sensor dengan permukaan target (meter)  
* *v* \= Kecepatan rambat gelombang suara di udara (≈ 343 m/s pada suhu 20°C  
* t \= Total waktu tempuh dari pemancaran (Trig) hingga penerimaan pantulan gelombang (Echo)(detik)

  Persentase volume kepenuhan wadah (*bin*) dihitung dari selisih tinggi total tempat sampah dikurangi jarak ukur s.

  4. **Sensor Gas MQ-135 dan Manajemen Pemanas via MOSFET**

  Sensor MQ-135 merupakan sensor kualitas udara berbasis materi semikonduktor Tin Dioxide (${Sn0}_{2}$). Konduktivitas bahan ${Sn0}_{2}$ di udara bersih tergolong rendah, namun akan meningkat seiring tingginya konsentrasi gas pencemar organik di sekitarnya, khususnya Amonia (${NH}_{3}$), Sulfida, Benzena, dan uap asam hasil pembusukan sampah.

  Sensor seri MQ membutuhkan elemen pemanas internal (internal heater) agar elemen semikonduktor mencapai suhu operasional ideal (300°C \- 400°C). Elemen pemanas ini menyedot arus yang tergolong tinggi (∼150 mA \- 200 mA). Untuk menghemat konsumsi daya baterai pada node IoT, diterapkan teknik Pulsed Heating menggunakan MOSFET Logic-Level FR120N. MOSFET berfungsi sebagai saklar elektronik yang dikontrol oleh sinyal GPIO mikrokontroler untuk hanya menyalakan pemanas sensor beberapa detik sebelum pembacaan data dilakukan, lalu mematikannya kembali saat siklus Deep Sleep.

     5. **Manajemen Daya Solar Energy (CN3065)**

  CN3065 adalah modul Integrated Circuit (IC) pemantau dan pengisi daya baterai Lithium-Ion/Lithium-Polymer yang dirancang khusus untuk aplikasi tenaga surya (Solar Charger Controller). IC ini bekerja dengan memanfaatkan metode pengisian Constant-Current/Constant-Voltage (CC/CV).

  Keunggulan utama CN3065 dibandingkan modul pengisi daya USB konvensional (seperti TP4056) adalah kemampuannya dalam menangani fluktuasi tegangan dan arus dari panel surya akibat gueperubahan intensitas cahaya matahari (cloudy/sunlight condition) pada rentang tegangan *4.4V – 6V* secara stabil tanpa mengalami panas berlebih (overheating).

     6. **Database Geospasial (PostgreSQL \+ PostGIS)**

  PostgreSQL merupakan sistem manajemen basis data relasional objek (Object-Relational Database Management System / ORDBMS) bersifat open-source. Ekstensi PostGIS menambahkan dukungan objek dan fungsi geospasial pada database PostgreSQL, sehingga mampu menyimpan tipe data lokasi seperti titik (Point), garis (LineString), dan poligon (Polygon).

  Dalam konteks sistem monitoring terdistribusi stasioner, penggunaan PostGIS menggantikan kebutuhan modul GPS fisik pada perangkat IoT. Koordinat geospasial (*lat, long*) setiap tempat sampah dicatat secara permanen (static geocoding) pada database. Ekstensi PostGIS memungkinkan analisis koordinat spasial cepat, seperti perhitungan jarak terdekat antar-TPS (Euclidean Distance atau Network Distance) menggunakan Spatial Querying terindeks.

     7. **Capacitated Vehicle Routing Problem (CVRP)**

  Capacitated Vehicle Routing Problem (CVRP) adalah bentuk perluasan dari pemodelan Travelling Salesperson Problem (TSP) pada riset operasi dan analisis rute transportasi. Tujuan utama CVRP adalah menentukan himpunan jalur lintasan kendaraan terpendek dan paling efisien untuk melayani sejumlah titik lokasi (TPS) dengan meminimalkan total jarak tempuh atau biaya operasional.

  Formulasi CVRP memperhitungkan batasan-batasan (constraints) dunia nyata, antara lain:

* **Kapasitas Kendaraan (C):** Total volume atau tonase muatan yang diangkut oleh satu armada tidak boleh melebihi kapasitas maksimum truk.  
* **Prioritas Titik Singgah:** Hanya tempat sampah dengan tingkat kepenuhan atau kadar busuk yang telah melewati threshold tertentu (≥ 80%) yang masuk ke dalam grafik jaringan rute.  
* **Geometri Jaringan Jalan:** Perhitungan rute mengikuti grafik arah jalan nyata, bukan sekadar jarak garis lurus (backtracking avoidance).

# **BAB III**

# **METODOLOGI DAN PERANCANGAN SISTEM**

1. ## **Diagram Blok & Alur Kerja Sistem**

Penelitian dan pengembangan sistem Sugeng dilaksanakan melalui pendekatan rekayasa sistem (*system engineering*) yang terstruktur dari perancangan perangkat keras hingga pengujian lapangan. Diagram alur kerja sistem yang menggambarkan proses pemrosesan data telemetri secara rinci disajikan pada Gambar 3.1. 

![][image2]  
**Gambar 3.1** *Alur Kerja Sistem*

2. ## **Diagram Arsitektur Sistem (4-Tier)** 

Secara keseluruhan, arsitektur sistem Sugeng dirancang dalam 4 lapisan (*4-Tier Layer Architecture*) yang saling terintegrasi secara modular, aman, dan hemat energi, sebagaimana ditunjukkan pada Gambar 3.2. ![][image3]  
**Gambar 3.2** *Arsitektur Sistem*

3. ## **Spesifikasi Perangkat (Hardware & Software)**

Spesifikasi teknis alat pendukung yang digunakan dalam perancangan sistem Sugeng mencakup komponen *hardware* pada *node* IoT dan infrastruktur *software* pendukung. Rincian spesifikasi komponen perangkat keras yang digunakan disajikan secara lengkap pada Tabel 3.1. 

**Tabel 3.1** *Spesifikasi Perangkat Keras (Hardware)*

| Kategori | Nama Komponen | Spesifikasi Teknis | Fungsi Utama dalam Sistem |
| ----- | ----- | ----- | ----- |
| Microcontroller | ESP32 DevKit V1 | 30-Pin, Tensilica Dual-Core, Wi-Fi & BLE, Deep Sleep Support | Unit pemroses utama, pengolah sinyal ADC, dan pengirim data telemetri. |
| Distance Sensor | JSN-SR04T | Ultrasonic Waterproof Transducer, IP67, Range 20–600 cm | Mengukur jarak permukaan tumpukan sampah ke tutup tempat sampah. |
| Air Quality Sensor | MQ-135 | Semikonduktor${SnO}_{2}$, Deteksi Amonia (${NH}_{3}$), Sulfida, Asam | Mendeteksi emisi gas bau pembusukan limbah organik. |
| Methane Sensor | MQ-4 | Semikonduktor ${SnO}_{2}$, Deteksi Metana (${CH}_{4}$), CNG, Natural Gas | Mendeteksi gas Metana berlebih pemicu potensi ledakan/kebakaran. |
| Environment Sensor | DHT22 | Capacitive Humidity & Thermistor, Range Temp *\-40* to *80°C* | Memantau suhu dan kelembapan mikro di dalam wadah tempat sampah. |
| Power Switch | MOSFET FR120N | N-Channel Logic-Level Optocoupler Module | Memutus/menghubungkan daya *heater* sensor MQ saat *Deep Sleep* (*pulsed heating*). |
| Solar Charger | CN3065 Module | Solar Lithium-Ion Battery Charger, CC/CV Mode, Input 4.4V–6V | Mengatur arus pengisian daya baterai dari solar panel secara stabil. |
| Voltage Booster | MT3608 Step-Up | DC-DC Step-Up Converter, Input 2V–24V, Output Boost 5V | Menaikkan tegangan baterai 3.7V menjadi 5V murni untuk suplai sensor. |
| Energy Storage | Baterai Li-Ion 18650 | 2 Cell Parallel (1S2P), Total Kapasitas ≈ 3000–5000 mAh | Penyimpan daya mandiri agar *node IoT* beroperasi 24/7 *outdoor*. |
| Solar Harvesting | Mini Solar Panel | Monocrystalline 6V / 1W  ≈ 200 mAh | Menyerap energi matahari sebagai pengisi daya baterai utama. |
| Enclosure | Tempat Sampah 120L & Box PVC | Kapasitas 120 Liter HDPE & Box Panel Waterproof IP65 | Wadah pengujian fisik TPS dan pelindung rangkaian elektronik dari cuaca. |

Sementara itu, rincian spesifikasi perangkat lunak (*software*) serta *tools* yang digunakan untuk mendukung operasional sistem Sugeng disajikan pada Tabel 3.2. 

**Tabel 3.2** *Spesifikasi Perangkat Lunak (Software)* 

| Kategori | Nama Software / Tools | Spesifikasi / Framework | Fungsi Utama |
| ----- | ----- | ----- | ----- |
| Firmware IDE | VS Code \+ PlatformIO / Arduino IDE | C / C++ Compiler for ESP32 | Pemrograman logika *node*, pembacaan sensor, dan manajemen *Deep Sleep*. |
| Backend Engine | Python FastAPI | Asynchronous Web Framework | Mengelola ingesti data telemetri, validasi payload, dan eksekusi AI. |
| Database Core | Supabase | PostgreSQL \+ PostGIS Extension | Menyimpan log telemetri *time-series* dan koordinat spasial TPS (*lat, long*). |
| AI Routing Engine | Google OR-Tools | Python Vehicle Routing Solver | Menyelesaikan algoritma *Capacitated Vehicle Routing Problem* (CVRP). |
| Frontend Dashboard | TypeScript React \+ Astro \+ Tailwind CSS | Leaflet.js / Mapbox, Shadcn UI | Dashboard SIG interaktif visualisasi status TPS dan rute armada. |
| Diagramming Tools | Mermaid.js / Draw.io / Fritzing | Open-Source Modeling Tools | Pemodelan diagram blok, flowchart, dan skematik *wiring* fisik. |
| 3D Design | Blender | Open-Source 3D Modelling | Membuat desain 3D, mockup produk. |

4. **Perancangan Wiring & Pemetaan Pin Interkoneksi**

Pemetaan jalur perkabelan (*wiring layout*) antara komponen sensor, aktuator/saklar daya, dan mikrokontroler ESP32 DevKit V1 (30-Pin) dirancang untuk memastikan kompatibilitas logika tegangan dan efisiensi konsumsi daya, sebagaimana disajikan pada Tabel 3.3.  

**Tabel 3.3** *Kebutuhan Komponen Perancangan*

| Nama Komponen | Pin Komponen | Pin Terhubung ke ESP32 / System | Keterangan & Jenis Sinyal |
| ----- | ----- | ----- | ----- |
| **Sensor JSN-SR04T** | Trig | GPIO 12 | Output Digital ESP32 (Picu Gelombang Sonar) |
| **Sensor JSN-SR04T** | Echo | GPIO 13 | Input Digital ESP32 (Hitung *Time of Flight*) |
| **Sensor JSN-SR04T** | VCC / GND | OUT+ MT3608 (5V) / Common GND | Daya Sensor (Membutuhkan 5V stabil) |
| **Sensor DHT22** | DATA | GPIO 14 | Input Digital (*One-Wire Protocol*) |
| **Sensor DHT22** | VCC / GND | 3.3V ESP32 / Common GND | Daya Sensor Suhu & Kelembapan |
| **Sensor MQ-135** | A0 (Analog Out) | GPIO 34 | Input Analog ADC1 (Channel 6\) |
| **Sensor MQ-135** | VCC / GND | Switched VCC (MOSFET) / GND | Daya Pemanas & Pembacaan Gas |
| **Sensor MQ-4** | A0 (Analog Out) | GPIO 35 | Input Analog ADC1 (Channel 7\) |
| **Sensor MQ-4** | VCC / GND | Switched VCC (MOSFET) / GND | Daya Pemanas & Pembacaan Gas Metana |
| **Modul MOSFET FR120N** | SIG (Signal) | GPIO 4 | Output Digital (Pengendali Saklar *Heater*) |
| **Modul MOSFET FR120N** | V+ / V- (Input) | OUT+ MT3608 (5V) / Common GND | Jalur Daya Utama 5V dari Boost Converter |
| **Modul MOSFET FR120N** | VIN+ / VIN- (Load) | VCC & GND Sensor MQ-135 & MQ-4 | Jalur Terputus/Terhubung untuk *Pulsed Heating* |
| **Solar Panel 6V 1W** | Positive (+) / Negative (-) | Input (+) / Input (-) CN3065 | Masukan Daya Tenaga Surya |
| **Modul CN3065** | BAT+ / BAT- | (+) / (-) Baterai 18650 1S2P | Pengisian Daya Baterai Li-Ion |
| **Modul CN3065** | SYS+ / SYS- | IN+ / IN- MT3608 Step-Up | Output Daya Baterai (3.0V–4.2V) |
| **Step-Up MT3608** | OUT+ / OUT- | Vin ESP32 & VCC Sensor (5V) / GND | Jalur Utama Suplai Tegangan 5V Sistem |

5. **Perancangan Mekanik & Enclosure Node Smart Bin**   
   1. **Pemasangan Hardware pada Tempat Sampah 120L:**   
      1. *Probe Transducer* **JSN-SR04T** dipasang menembus bagian dalam tengah tutup tempat sampah 120L menghadap tegak lurus ke dasar *bin*.  
      2. Sensor **MQ-135, MQ-4,** dan **DHT22** dipasang pada dinding bagian atas dalam *bin* yang diberi kisi-kisi ventilasi agar uap gas pembusukan dapat terdeteksi tanpa terkena kontak fisik sampah padat.  
      3. **Mini Solar Panel 6V 1W** dipasang rata pada permukaan luar atas tutup tempat sampah menggunakan perekat kedap air (sealant silicone) agar mendapatkan paparan sinar matahari optimal.

   2. **Box Panel Plastik Waterproof (IP65)**  
      1. Seluruh rangkaian elektronik utama (ESP32, CN3065, MT3608, FR120N, dan Holder Baterai 18650\) dimasukkan ke dalam box panel PVC terisolasi untuk melindungi sistem dari kelembaban tingginya uap asam sampah dan guyuran air hujan. 

   

6. **Perancangan Software Backend, AI CVRP & Web Dashboard**  
1. **Formulasi Persamaan Pengolahan Data Edge (Firmware)**  
   	Persentase volume kepenuhan sampah *(V%)* pada wadah tempat sampah berkapasitas tinggi total ${H}_{total}$ cm dan jarak ukur sensor ${S}_{jarak}$ cm dirumuskan sebagai:   
   $V%\ =\ (\frac{{H}_{total}\ -\ {S}_{jarak}}{{H}_{total}\ -\ {S}_{blind}})$ x 100%  
   *Keterangan:* ${S}_{blind}$ adalah batas *blind zone* sensor JSN-SR04T (≈ 20 cm). 

2. **Skema Database Geospasial (PostGIS DDL Summary)**  
   Tabel utama *tps\_nodes* menyimpan lokasi geospasial permanen (*static geocoding*): 

| CREATE EXTENSION IF NOT EXISTS postgis; CREATE TABLE tps\_nodes (     id VARCHAR(20) PRIMARY KEY,     nama\_tps VARCHAR(100) NOT NULL,     location GEOMETRY(Point, 4326) NOT NULL,     capacity\_liters INT DEFAULT 120,     status\_priority BOOLEAN DEFAULT FALSE ); |
| :---- |

3. **Logika Optimasi Rute (CVRP Google OR-Tools**  
   Algoritma CVRP memproses data TPS terpilih yang memiliki $V%\geq 75%$ atau indikator gas bau tinggi. Fungsi tujuan (*objective function*) meminimalkan total jarak tempuh rute armada $K$: 

$min\ \sum\limits_{k\epsilon K}^{}\sum\limits_{i\epsilon N}^{}\sum\limits_{j\epsilon N}^{}{c}_{ij}\cdot {x}_{ijk}$  
Dengan batasan (*constraints*):

1. ${\Sigma }_{i\epsilon n}\ {q}_{i}\cdot {y}_{ik}\leq {C}_{k}$ *(Total muatan sampah TPS ${q}_{i}$ tidak boleh melebihi kapasitas truk ${C}_{k}{\ }$)*.  
   2. Setiap TPS berstatus prioritas hanya dikunjungi tepat satu kali oleh satu kendaraan.

7. **Skenario Pengujian Sistem**

Pengujian dilakukan secara komprehensif untuk memvalidasi keandalan sistem fisik dan lunak:

1. **Pengujian Akurasi Sensor Jarak (JSN-SR04T):** Membandingkan hasil ukur sensor JSN-SR04T dengan pita ukur manual pada media tumpukan sampah anorganik dan organik dengan berbagai variasi ketinggian (10 cm – 100 cm).  
2. **Pengujian Responsivitas Sensor Gas (MQ-135 & MQ-4) dan Efficiency Power:** Menguji pembacaan grafik kenaikan gas saat *pulsed heating* aktif (MOSFET ON) serta mengukur konsumsi arus listrik (mA) pada mode *Active* vs *Deep Sleep*.  
3. **Pengujian Daya Tahan Mandiri (Solar Harvesting):** Mengukur profil pengisian tegangan baterai 18650 via CN3065 & Solar Panel 6V selama 7 hari berturut-turut pada kondisi cuaca terik dan mendung.  
4. **Pengujian Latensi Transmisi Telemetri:** Mengukur *delay* waktu (milidetik) transmisi data dari ESP32 hingga berhasil tersimpan pada database Supabase melalui protokol HTTP/MQTT.  
5. **Pengujian Algoritma Rute CVRP:** Membandingkan total jarak tempuh (km) dan konsumsi BBM rute konvensional (statis) vs rute dinamis hasil olahan Google OR-Tools pada dashboard SIG.

# **BAB IV**  **RENCANA ANGGARAN BIAYA DAN** **JADWAL PELAKSANAAN**

1. ## **Rencana Anggaran Biaya (RAB)**

Perancangan dan implementasi fisik sistem Sugeng memerlukan alokasi anggaran yang mencakup pengadaan komponen perangkat keras (hardware) utama serta bahan-bahan pendukung proyek. Rincian rencana anggaran biaya (RAB) secara lengkap disajikan pada Tabel 4.1.

**Tabel 4.1** *Rencana Anggaran Biaya*

| No | Uraian Kegiaatan | Spesifikasi  | Qt | Harga | Total Harga | Link |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| **A. Komponen Utama** |  |  |  |  |  |  |
| 1 | ESP32 Development Board | NodeMCU ESP-WROOM-32 | 1 | Rp79.000,00 | Rp79.000,00 | [https://id.shp.ee/7BHrD8eX](https://id.shp.ee/7BHrD8eX) |
| 2 | Mini Solar Panel | 6V, 1W, 200 mA | 2 | Rp15.000,00 | Rp30.000,00 | [https://id.shp.ee/HXbh4xaE](https://id.shp.ee/HXbh4xaE) |
| 3 | Sensor DHT22 | Module Suhu & Kelembapan Udara | 2 | Rp22.200,00 | Rp44.400,00 | [https://id.shp.ee/Co1XEnfp](https://id.shp.ee/Co1XEnfp) |
| 4 | Module Sensor Jarak JSN-SR04T  | Ultrasonik Waterproof | 2 | Rp65.000,00 | Rp130.000,00 | [https://id.shp.ee/LEhzQFfn](https://id.shp.ee/LEhzQFfn) |
| 5 | Module MQ-135  | Sensor untuk mendeteksi gas amonia (NH3) | 2 | Rp24.800,00 | Rp49.600,00 | [https://id.shp.ee/LEhzQFfn](https://id.shp.ee/LEhzQFfn) |
| 6 | Module MQ-4 Methane Gas Sensor  | Sensor untuk mendeteksi gas metana (CH₄) | 2 | Rp24.500,00 | Rp49.000,00 | [https://id.shp.ee/BDfMjGv1](https://id.shp.ee/BDfMjGv1) |
| 7 | Module Mosfet FR120N | 8.4 A, 100 volt  | 2 | Rp8.500,00 | Rp17.000,00 | [https://id.shp.ee/qdDsv1vT](https://id.shp.ee/qdDsv1vT) |
| 8 | Baterai Li-Ion 18650 | 1500 mAh | 4 | Rp8.263,00 | Rp33.053,00 | [https://id.shp.ee/My9yZzET](https://id.shp.ee/My9yZzET) |
| 9 | CN3065 Mini Solar Panel Regulator | 4.4-6 volt | 2 | Rp18.000,00 | Rp36.000,00 | [https://id.shp.ee/VhwHe4iN](https://id.shp.ee/VhwHe4iN) |
| 10 | Baterai Case Holder 18650  | Paralel, Kapasitas 2 slots | 2 | Rp9.000,00 | Rp18.000,00 | [https://id.shp.ee/a1q7uBHx](https://id.shp.ee/a1q7uBHx) |
| 11 | Step-Up Booster MT3608 | 2A, micro usb | 2 | Rp7.300,00 | Rp14.600,00 | [https://id.shp.ee/buf83xRq](https://id.shp.ee/buf83xRq) |
|  |  |  |  |  |  |  |
| Total Komponen Utama |  |  |  |  | Rp500.653,00 |  |
|  |  |  |  |  |  |  |
| **B. Bahan Pendukung** |  |  |  |  |  |  |
| 1 | Kabel Jumper | Male-to-Female | 1 | Rp12.000,00 | Rp12.000,00 | [https://id.shp.ee/UuJYfMun](https://id.shp.ee/UuJYfMun) |
| 2  | Kabel Jumper | Female-to-Female | 1 | Rp11.500,00 | Rp11.500,00 | [https://id.shp.ee/U9S5Sm4A](https://id.shp.ee/U9S5Sm4A) |
| 3 | Kabel Jumper | Male-to-Male | 1 | Rp12.500,00 | Rp12.500,00 | [https://id.shp.ee/ESpboBw2](https://id.shp.ee/ESpboBw2) |
| 4 | Tempat Sampah | 120L | 2 | Rp180.000,00 | Rp360.000,00 | [https://id.shp.ee/taNzcNvC](https://id.shp.ee/taNzcNvC) |
| 5 | Box Panel Listrik | 158x99mm | 2 | Rp46.900,00 | Rp93.800,00 | [https://id.shp.ee/uypd4iCV](https://id.shp.ee/uypd4iCV) |
|  |  |  |  |  |  |  |
| Total Bahan Pendukung |  |  |  |  | Rp489.800,00 |  |
| Total Rencana Anggaran Biaya (RAB) |  |  |  |  | Rp990.453,00 |  |

2. **Jadwal Pelaksanaan**

Pelaksanaan proyek pengembangan sistem Sugeng direncanakan berlangsung selama 10 minggu, terhitung mulai dari tahap penyusunan proposal hingga penyelesaian laporan akhir dan demonstrasi produk. Rincian alokasi waktu serta tahapan kegiatan tersebut disajikan secara sistematis pada Tabel 4.2.

**Tabel 4.2**  *Jadwal Pelaksanaan Kegiatan*

|  Tahapan Kegiatan | Pelaksanaan (Minggu) |  |  |  |  |  |  |  |  |  |
| ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
|  | **1** | **2** | **3** | **4** | **5** | **6** | **7** | **8** | **9** | **10** |
| Penyusunan & Pengajuan Proposal |  |  |  |  |  |  |  |  |  |  |
| Perancangan Arsitektur Sistem & Wiring |  |  |  |  |  |  |  |  |  |  |
| Pengadaan Bahan & Perakitan Hardware IoT  |  |  |  |  |  |  |  |  |  |  |
| Pemrograman Firmware & Kalibrasi Sensor  |  |  |  |  |  |  |  |  |  |  |
| Pengembangan Backend FastAPI & PostGIS  |  |  |  |  |  |  |  |  |  |  |
| Integrasi Algoritma Routing CVRP  |  |  |  |  |  |  |  |  |  |  |
| Pengembangan Web Dashboard SIG  |  |  |  |  |  |  |  |  |  |  |
| Integrasi End-to-End Sistem  |  |  |  |  |  |  |  |  |  |  |
| Pengujian Lapangan & Bug Fixing  |  |  |  |  |  |  |  |  |  |  |
| Pelaporan Akhir, Dokumentasi & Presentasi  |  |  |  |  |  |  |  |  |  |  |

# **BAB V**

# **DAFTAR PUSTAKA**

Rafi'udin, W., Ramadhani, A. D., & Ningsih, N. (2026). Sistem manajemen pengambilan sampah pintar menggunakan metode fuzzy. *Journal of Telecommunication, Electronics, and Control Engineering (JTECE)*, *8*(2), 96–107. [https://doi.org/10.1016/j.scs.2025.106223](https://www.google.com/search?q=https://doi.org/10.1016/j.scs.2025.106223)  
Rosmita, Hamrul, H., & Musawwir. (2026). Sistem monitoring tempat sampah pintar di kampus Universitas Sulawesi Barat berbasis IoT dengan algoritma Fuzzy Logic. *JATI (Jurnal Mahasiswa Teknik Informatika)*, *10*(3), 5027–5032.   
Ihsan, O. M., Nasution, M. I. A., Verina, W., & Nugraha, B. (2025). Pengembangan aplikasi mobile IoT untuk meningkatkan partisipasi masyarakat dalam pengelolaan sampah berkelanjutan berbasis Android. *Jurnal Sistem Informasi TGD*, *4*(6), 1316–1327. [https://doi.org/10.20895/JTECE.V812.1980](https://www.google.com/search?q=https://doi.org/10.20895/JTECE.V812.1980).   
Rais, N. A. R., & Rokhmah, S. (2025). Smart composting system: Inovasi IoT untuk pengolahan dan pemantauan sampah organik rumah tangga. *JIPI (Jurnal Ilmiah Penelitian dan Pembelajaran Informatika)*, *10*(4), 3950–3963. [https://doi.org/10.29100/jipi.v10i4.9365](https://www.google.com/search?q=https://doi.org/10.29100/jipi.v10i4.9365)  
Su, S., Hu, J., Li, W., Esztergár-Kiss, D., & Zhou, T. (2025). A flexible waste bin number allocation plan applied to waste transportation electric fleets in smart cities. *Sustainable Cities and Society*, *121*, Article 106223\. [https://doi.org/10.1016/j.scs.2025.106223](https://www.google.com/search?q=https://doi.org/10.1016/j.scs.2025.106223) 
