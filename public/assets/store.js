// Lapisan penyimpanan Firestore untuk Aplikasi Qurban Al-Hikmah.
// Memakai Firebase compat SDK yang dimuat lewat CDN di tiap halaman:
//   firebase-app-compat.js, firebase-firestore-compat.js, firebase-config.js.
//
// Sumber data: koleksi `warga`, satu dokumen per warga:
//   { nama, rt, key, noKupon, sudahTukar }
// `key` = "nama||rt" (huruf kecil) untuk deteksi duplikat.

const QurbanStore = (function () {
    const KOLEKSI = 'warga';
    const MAKS_TULIS_BATCH = 400;
    let db = null;

    function konfigurasiLengkap() {
        if (typeof firebaseConfig !== 'object' || firebaseConfig === null) return false;
        const apiKey = String(firebaseConfig.apiKey || '');
        const projectId = String(firebaseConfig.projectId || '');
        return apiKey !== '' && !apiKey.startsWith('ISI_')
            && projectId !== '' && !projectId.startsWith('ISI_');
    }

    function pesananKonfigurasi() {
        return 'Konfigurasi Firebase belum diisi.\nLengkapi public/assets/firebase-config.js sesuai README (bagian Setup Firebase).';
    }

    function siap() {
        if (db) return db;
        if (!konfigurasiLengkap()) {
            throw new Error(pesananKonfigurasi());
        }
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        return db;
    }

    function wargaKey(nama, rt) {
        const namaNorm = String(nama || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const rtNorm = String(rt || '').trim().toLowerCase();
        return `${namaNorm}||${rtNorm}`;
    }

    function normalisasiDoc(doc) {
        const data = doc.data() || {};
        return {
            id: doc.id,
            nama: String(data.nama || ''),
            rt: String(data.rt || ''),
            noKupon: Number.isInteger(data.noKupon) && data.noKupon >= 1 ? data.noKupon : 0,
            sudahTukar: data.sudahTukar === true,
            waktuTukar: typeof data.waktuTukar === 'number' ? data.waktuTukar : null
        };
    }

    function urutkanWarga(list) {
        return [...list].sort((a, b) => {
            if (a.rt !== b.rt) return String(a.rt).localeCompare(String(b.rt), undefined, { numeric: true });
            return String(a.nama).localeCompare(String(b.nama));
        });
    }

    async function muatSemua() {
        const snapshot = await siap().collection(KOLEKSI).get();
        return snapshot.docs.map(normalisasiDoc);
    }

    // Langganan realtime: callback dipanggil tiap perubahan data.
    // Return unsubscribe() untuk menghentikan langganan.
    function dengarkan(onData, onGalat) {
        try {
            return siap().collection(KOLEKSI).onSnapshot(
                (snapshot) => onData(snapshot.docs.map(normalisasiDoc)),
                (err) => { if (onGalat) onGalat(err); }
            );
        } catch (err) {
            if (onGalat) onGalat(err);
            return () => {};
        }
    }

    async function tambah(nama, rt) {
        const namaB = String(nama || '').trim();
        const rtB = String(rt || '').trim();
        if (!namaB || !rtB) throw new Error('Nama dan RT wajib diisi.');

        const store = siap();
        const key = wargaKey(namaB, rtB);
        const dup = await store.collection(KOLEKSI).where('key', '==', key).limit(1).get();
        if (!dup.empty) throw new Error('Data duplikat: nama dan RT ini sudah ada.');

        const semua = await muatSemua();
        const noKupon = semua.reduce((maks, w) => w.noKupon >= 1 ? Math.max(maks, w.noKupon) : maks, 0) + 1;

        const kolom = { nama: namaB, rt: rtB, key, noKupon, sudahTukar: false };
        const ref = await store.collection(KOLEKSI).add(kolom);
        return { id: ref.id, ...kolom };
    }

    async function ubah(id, dataBaru) {
        const store = siap();
        const ref = store.collection(KOLEKSI).doc(id);
        const doc = await ref.get();
        if (!doc.exists) throw new Error('Data warga tidak ditemukan.');

        const nama = String(dataBaru?.nama || '').trim();
        const rt = String(dataBaru?.rt || '').trim();
        if (!nama || !rt) throw new Error('Nama dan RT wajib diisi.');

        const key = wargaKey(nama, rt);
        const dup = await store.collection(KOLEKSI).where('key', '==', key).get();
        if (dup.docs.some(d => d.id !== id)) throw new Error('Data duplikat: nama dan RT ini sudah ada.');

        const lama = normalisasiDoc(doc);
        await ref.update({ nama, rt, key });
        return { ...lama, nama, rt };
    }

    async function setTukar(id, nilai) {
        const store = siap();
        const ref = store.collection(KOLEKSI).doc(id);
        const patch = { sudahTukar: nilai === true };
        if (nilai === true) {
            patch.waktuTukar = Date.now();
        } else {
            patch.waktuTukar = firebase.firestore.FieldValue.delete();
        }
        await ref.update(patch);
        const doc = await ref.get();
        if (!doc.exists) throw new Error('Data warga tidak ditemukan.');
        return normalisasiDoc(doc);
    }

    async function hapus(id) {
        await siap().collection(KOLEKSI).doc(id).delete();
    }

    async function hapusSemua() {
        const store = siap();
        const snapshot = await store.collection(KOLEKSI).get();
        const ops = snapshot.docs.map(doc => ({ tipe: 'hapus', ref: doc.ref }));
        await eksekusiBatch(ops);
        return ops.length;
    }

    async function importWarga(rowsDariFile, mode) {
        if (mode !== 'timpa' && mode !== 'gabung') {
            throw new Error('Kirim mode: "timpa" atau "gabung".');
        }
        if (!Array.isArray(rowsDariFile) || !rowsDariFile.length) {
            throw new Error('Tidak ada data warga valid untuk diimpor.');
        }

        const store = siap();
        const valid = rowsDariFile
            .map(row => {
                const nama = String(row?.nama ?? '').replace(/\s+/g, ' ').trim();
                const rt = String(row?.rt ?? '').trim();
                if (!nama || !rt) return null;
                return {
                    nama,
                    rt,
                    key: wargaKey(nama, rt),
                    noKupon: Number.isInteger(row?.noKupon) && row.noKupon >= 1 ? row.noKupon : undefined,
                    sudahTukar: row?.sudahTukar === true
                };
            })
            .filter(Boolean);

        const list = mode === 'gabung'
            ? (await muatSemua()).map(w => ({ ...w, key: wargaKey(w.nama, w.rt) }))
            : [];
        const existingCount = list.length;
        const seen = new Set(list.map(w => w.key));
        const dupeItems = [];

        for (const baris of valid) {
            if (seen.has(baris.key)) {
                dupeItems.push(baris);
                continue;
            }
            seen.add(baris.key);
            list.push(baris);
        }

        perbaikiNomorKupon(list);

        const ops = [];
        if (mode === 'timpa') {
            const snapshot = await store.collection(KOLEKSI).get();
            snapshot.docs.forEach(doc => ops.push({ tipe: 'hapus', ref: doc.ref }));
        }
        list.forEach(w => {
            const kolom = {
                nama: w.nama,
                rt: w.rt,
                key: w.key,
                noKupon: w.noKupon,
                sudahTukar: w.sudahTukar === true
            };
            if (Number.isFinite(w.waktuTukar)) kolom.waktuTukar = w.waktuTukar;
            const ref = w.id ? store.collection(KOLEKSI).doc(w.id) : store.collection(KOLEKSI).doc();
            ops.push({ tipe: 'set', ref, data: kolom });
        });
        await eksekusiBatch(ops);

        return {
            valid: rowsDariFile.length,
            ditambahkan: mode === 'timpa' ? list.length : Math.max(0, list.length - existingCount),
            duplikat: dupeItems.length,
            contoh: dupeItems.slice(0, 8).map(d => ({ nama: d.nama, rt: d.rt }))
        };
    }

    function perbaikiNomorKupon(list) {
        const dipakai = new Set();
        for (const row of urutkanWarga(list)) {
            if (Number.isInteger(row.noKupon) && row.noKupon >= 1 && !dipakai.has(row.noKupon)) {
                dipakai.add(row.noKupon);
            } else {
                row.noKupon = undefined;
            }
        }
        let next = (list.length ? Math.max(0, ...[...dipakai]) : 0) + 1;
        for (const row of urutkanWarga(list)) {
            if (row.noKupon === undefined) row.noKupon = next++;
        }
    }

    async function eksekusiBatch(ops) {
        const store = siap();
        for (let i = 0; i < ops.length; i += MAKS_TULIS_BATCH) {
            const batch = store.batch();
            for (const op of ops.slice(i, i + MAKS_TULIS_BATCH)) {
                if (op.tipe === 'hapus') batch.delete(op.ref);
                else batch.set(op.ref, op.data);
            }
            await batch.commit();
        }
    }

    return {
        konfigurasiLengkap,
        pesananKonfigurasi,
        muatSemua,
        dengarkan,
        tambah,
        ubah,
        setTukar,
        hapus,
        hapusSemua,
        importWarga
    };
})();
