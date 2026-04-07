import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, update } from 'firebase/database';

// Firebase configurado para o projeto Esquema
const firebaseConfig = {
  apiKey: "AIzaSyCstcfaNqg5t3pcarj2A4FI936gey2oUjQ",
  authDomain: "esquema-b38ab.firebaseapp.com",
  databaseURL: "https://esquema-b38ab-default-rtdb.firebaseio.com",
  projectId: "esquema-b38ab",
  storageBucket: "esquema-b38ab.firebasestorage.app",
  messagingSenderId: "457430403565",
  appId: "1:457430403565:web:0bf81708be9d306527ffe4"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- Funções do banco ---

export function roomRef(code) {
  return ref(db, 'rooms/' + code);
}

export async function createRoom(code, data) {
  await set(roomRef(code), data);
}

export async function getRoom(code) {
  const snap = await get(roomRef(code));
  return snap.exists() ? snap.val() : null;
}

export async function updateRoom(code, data) {
  await update(roomRef(code), data);
}

export async function setRoom(code, data) {
  await set(roomRef(code), data);
}

export function onRoomChange(code, callback) {
  return onValue(roomRef(code), (snap) => {
    if (snap.exists()) callback(snap.val());
  });
}
