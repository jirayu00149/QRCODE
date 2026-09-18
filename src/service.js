import { demoItems } from './data.js';
import { validateImage, validatePost, isAllowedEmail, normalizeThaiPhone } from './utils.js';
import { cloudinaryConfig } from './cloudinary.js';

const env = import.meta.env;
export const configured = Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_AUTH_DOMAIN && env.VITE_FIREBASE_APP_ID);
export const state = { user: null, items: [], loading: true, error: '' };
let notify = () => {}, firebase, demoDb;
async function localDB() {
  if (demoDb) return demoDb;
  demoDb = await new Promise((resolve, reject) => {
    const request = indexedDB.open('khuenkan-demo', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('posts', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return demoDb;
}
async function localRead() {
  const db = await localDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction('posts').objectStore('posts').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function localWrite(item) {
  const db = await localDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('posts', 'readwrite');
    tx.objectStore('posts').put(item);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
export async function init(onChange) {
  notify = onChange;
  try {
    if (configured) {
      firebase = await import('./firebase-service.js');
      firebase.connect(env, user => { state.user = user; notify(); }, items => {
        state.items = items; state.loading = false; state.error = ''; notify();
      }, error => { state.loading = false; state.error = errorMessage(error); notify(); });
    } else {
      const saved = sessionStorage.getItem('khuenkan-demo-user');
      state.user = saved ? JSON.parse(saved) : null;
      const stored = await localRead();
      state.items = [...stored, ...demoItems()];
      state.loading = false;
      notify();
    }
  } catch (error) {
    state.loading = false; state.error = errorMessage(error); notify();
  }
}
export function demoLogin() {
  state.user = { uid: 'demo-user', displayName: 'ผู้ใช้งานทดลอง', email: 'demo@example.com' };
  sessionStorage.setItem('khuenkan-demo-user', JSON.stringify(state.user));
  notify();
}
export async function authenticate(mode, values) {
  values.email = values.email.trim().toLowerCase();
  if (!isAllowedEmail(values.email)) throw new Error('กรุณาใช้อีเมลมหาวิทยาลัย @tsu.ac.th เท่านั้น');
  if (!firebase) throw new Error('ยังไม่ได้เชื่อม Firebase กรุณาใช้ปุ่มทดลองใช้งานด้านล่าง');
  return firebase.authenticate(mode, values);
}
export const canParticipate = () => Boolean(state.user && (!configured || (isAllowedEmail(state.user.email) && state.user.emailVerified)));
export async function sendVerification() { if (firebase && state.user) await firebase.sendVerification(); }
export async function checkVerification() {
  if (firebase) { state.user = await firebase.reloadUser(); notify(); }
  return canParticipate();
}
export async function logout() {
  if (configured) await firebase.logout();
  else { state.user = null; sessionStorage.removeItem('khuenkan-demo-user'); notify(); }
}
async function prepareImage(file) {
  validateImage(file);
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('ไม่สามารถอ่านรูปภาพนี้ได้')), 'image/jpeg', .85));
  } finally { bitmap.close(); }
}
export async function createPost(values, file) {
  if (!state.user) throw new Error('กรุณาเข้าสู่ระบบก่อนลงประกาศ');
  if (!canParticipate()) throw new Error('กรุณายืนยันอีเมล @tsu.ac.th ก่อนลงประกาศ');
  if (configured) cloudinaryConfig(env);
  if (values.contactType === 'phone') values.contact = normalizeThaiPhone(values.contact);
  if (values.contactType === 'email') values.contact = values.contact.toLowerCase();
  validatePost(values);
  const blob = await prepareImage(file);
  const { contact, contactType, ...publicValues } = values;
  const post = { ...publicValues, id: crypto.randomUUID(), ownerId: state.user.uid, ownerName: state.user.displayName || 'สมาชิกคืนกัน', status: 'open', createdAt: Date.now() };
  if (configured) await firebase.createPost(post, { contact, contactType }, blob);
  else {
    post.imageUrl = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
    await localWrite({ ...post, privateContact: { contact, contactType } });
    state.items.unshift(post); notify();
  }
  return post.id;
}
export async function getContact(item) {
  if (!state.user) throw new Error('กรุณาเข้าสู่ระบบเพื่อดูช่องทางติดต่อ');
  if (!canParticipate()) throw new Error('กรุณายืนยันอีเมล @tsu.ac.th เพื่อดูช่องทางติดต่อ');
  if (item.example) return { contactType: 'example', contact: 'นี่คือประกาศตัวอย่าง ยังไม่มีผู้ติดต่อจริง' };
  if (configured) return firebase.getContact(item.id);
  const stored = await localRead();
  return stored.find(p => p.id === item.id)?.privateContact;
}
export async function markReturned(id) {
  const item = state.items.find(p => p.id === id);
  if (!state.user || item?.ownerId !== state.user.uid) throw new Error('เฉพาะเจ้าของประกาศเท่านั้นที่เปลี่ยนสถานะได้');
  if (configured) { await firebase.markReturned(id); item.status = 'returned'; notify(); }
  else {
    const posts = await localRead();
    const stored = posts.find(p => p.id === id);
    await localWrite({ ...stored, status: 'returned' });
    item.status = 'returned'; notify();
  }
}
export function errorMessage(error) {
  const messages = {
    'auth/invalid-credential': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'auth/email-already-in-use': 'อีเมลนี้ลงทะเบียนแล้ว กรุณาเข้าสู่ระบบ',
    'auth/weak-password': 'กรุณาใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร',
    'auth/invalid-email': 'รูปแบบอีเมลไม่ถูกต้อง',
    'auth/too-many-requests': 'มีการลองหลายครั้ง กรุณารอสักครู่แล้วลองใหม่',
    'auth/network-request-failed': 'เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต',
    'auth/operation-not-allowed': 'กรุณาเปิดใช้งาน Email/Password ใน Firebase Authentication',
    'auth/configuration-not-found': 'ยังไม่ได้เปิด Firebase Authentication กรุณาเปิด Email/Password ใน Firebase Console',
    'permission-denied': 'ยังเข้าถึงข้อมูลไม่ได้ กรุณาตรวจสอบ Firebase Security Rules',
    'storage/unauthorized': 'อัปโหลดไม่ได้ กรุณาตรวจสอบ Storage Security Rules',
    'unavailable': 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง',
  };
  return messages[error.code] || error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}
