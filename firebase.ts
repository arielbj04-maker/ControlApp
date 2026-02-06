import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- CONFIGURACIÓN DE FIREBASE ---
// 1. Ve a https://console.firebase.google.com/
// 2. Crea un proyecto nuevo (es gratis).
// 3. Agrega una "App Web" (icono de </>) a tu proyecto.
// 4. Copia el objeto 'firebaseConfig' que te dan y reemplaza los valores abajo.

const firebaseConfig = {
  apiKey: "AIzaSyCh0XY77PkFxgiHDYO-WrpiyQBtZXS4J1A",
  authDomain: "manager-2272b.firebaseapp.com",
  projectId: "manager-2272b",
  storageBucket: "manager-2272b.firebasestorage.app",
  messagingSenderId: "479058169956",
  appId: "1:479058169956:web:24f5cee6d8d6eada40cf71"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);