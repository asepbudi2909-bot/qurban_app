// Konfigurasi Firebase — WAJIB diisi sebelum deploy.
//
// Cara mendapatkan nilai ini:
//   1. Buka https://console.firebase.google.com dan buat/pilih project.
//   2. Project Overview -> ikon Web (</>) -> daftarkan aplikasi web.
//   3. Salin nilai "firebaseConfig" di bawah.
//
// Aktifkan Cloud Firestore di konsol: Build -> Firestore Database -> Create database.
// Jangan mengganti nama konstanta `firebaseConfig`.

const firebaseConfig = {
  apiKey: "ISI_API_KEY",
  authDomain: "ISI_PROJECT_ID.firebaseapp.com",
  projectId: "ISI_PROJECT_ID",
  storageBucket: "ISI_PROJECT.appspot.com",
  messagingSenderId: "ISI_SENDER_ID",
  appId: "ISI_APP_ID"
};
