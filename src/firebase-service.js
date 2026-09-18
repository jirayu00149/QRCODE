import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut, sendPasswordResetEmail, sendEmailVerification, reload, getIdToken } from 'firebase/auth';
import { isAllowedEmail } from './utils.js';
import { getFirestore, collection, query, orderBy, limit, onSnapshot, doc, getDoc, writeBatch, serverTimestamp, updateDoc } from 'firebase/firestore';
import { uploadImage, removeUnpublishedImage } from './cloudinary.js';
let auth, db, mediaEnv;
export function connect(env, onUser, onItems, onError) {
  const app = initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID, storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: env.VITE_FIREBASE_APP_ID });
  auth = getAuth(app); db = getFirestore(app); mediaEnv = env;
  onAuthStateChanged(auth, user => {
    if (user && !isAllowedEmail(user.email)) { signOut(auth).catch(onError); onUser(null); return; }
    onUser(user);
  }, onError);
  onSnapshot(query(collection(db, 'items'), orderBy('createdAt', 'desc'), limit(200)), async snapshot => {
    const items = snapshot.docs.map(d => ({ ...d.data(), id: d.id, createdAt: d.data().createdAt?.toMillis() || Date.now() }));
    // QR links still resolve to older posts outside the latest 200 records.
    const sharedId = new URLSearchParams(location.search).get('item');
    if (sharedId && /^[\w-]{1,128}$/.test(sharedId) && !items.some(i => i.id === sharedId)) {
      try { const shared = await getDoc(doc(db, 'items', sharedId)); if (shared.exists()) items.push({ ...shared.data(), id: shared.id, createdAt: shared.data().createdAt?.toMillis() || Date.now() }); }
      catch (error) { onError(error); return; }
    }
    onItems(items);
  }, onError);
}
export async function authenticate(mode, { email, password, name }) {
  if (mode === 'reset') return sendPasswordResetEmail(auth, email);
  if (mode === 'register') {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    try { await sendEmailVerification(result.user); }
    catch { throw new Error('สร้างบัญชีแล้ว แต่ส่งอีเมลยืนยันไม่สำเร็จ กรุณากดลงประกาศเพื่อส่งอีเมลยืนยันอีกครั้ง'); }
    return result;
  }
  return signInWithEmailAndPassword(auth, email, password);
}
export const logout = () => signOut(auth);
export const sendVerification = () => sendEmailVerification(auth.currentUser);
export async function reloadUser() { await reload(auth.currentUser); await getIdToken(auth.currentUser, true); return auth.currentUser; }
export async function createPost(post, contact, blob) {
  const { imageUrl, imagePath, deleteToken } = await uploadImage(blob, mediaEnv);
  try {
    const { id, ...data } = post;
    const batch = writeBatch(db);
    batch.set(doc(db, 'items', id), { ...data, imageUrl, imagePath, createdAt: serverTimestamp() });
    batch.set(doc(db, 'items', id, 'private', 'contact'), contact);
    await batch.commit();
  } catch (error) {
    await removeUnpublishedImage(deleteToken, mediaEnv);
    throw error;
  }
}
export async function getContact(id) {
  const result = await getDoc(doc(db, 'items', id, 'private', 'contact'));
  if (!result.exists()) throw new Error('ไม่พบข้อมูลติดต่อของประกาศนี้');
  return result.data();
}
export const markReturned = id => updateDoc(doc(db, 'items', id), { status: 'returned' });
