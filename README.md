# คืนกัน — Lost & Found สำหรับ TSU

เว็บภาษาไทยสำหรับประกาศของที่พบ/ของหาย ดูรายการผ่าน QR และติดต่อเพื่อรับคืน รองรับมือถือ สร้างด้วย Vite + JavaScript และ Firebase modular SDK

## เปิดเว็บในเครื่อง

```powershell
npm install
npm run dev -- --port 5173
```

เปิด http://localhost:5173 ใช้เว็บผ่าน server ไม่ใช่ดับเบิลคลิก index.html

```powershell
npm test
npm run build
npm run preview
```

## บัญชีและข้อมูล

- สมัคร/เข้าสู่ระบบ/ตั้งรหัสผ่านใหม่ด้วยอีเมล `@tsu.ac.th` เท่านั้น
- หลังสมัคร ระบบส่งอีเมลยืนยัน กดลิงก์ในอีเมลและกลับมากดตรวจสอบในเว็บ
- ทุกคนดูประกาศสาธารณะผ่าน QR ได้ แต่เฉพาะสมาชิก TSU ที่ยืนยันอีเมลแล้วจึงลงประกาศ ดูข้อมูลติดต่อ และเปลี่ยนสถานะประกาศของตนได้
- อัปโหลด JPG/PNG/WebP ไม่เกิน 5 MB เว็บย่อภาพให้ยาวสุด 1,400 พิกเซล และแปลงเป็น JPEG ก่อนส่ง Storage
- ติดต่อผ่าน LINE, เบอร์ไทย หรืออีเมล `@tsu.ac.th`; เบอร์ `0812345678` บันทึกเป็น `+66812345678`
- ค้นหาชื่อ รายละเอียด สถานที่ กรองหมวดหมู่ และเรียงจากใหม่/เก่า
- แสดงประกาศล่าสุดสูงสุด 200 รายการ; QR ที่อ้างถึงรายการเก่ากว่านี้ยังเปิดรายละเอียดได้
- QR มีทั้งหน้าเว็บและรายประกาศ ดาวน์โหลดเป็น PNG และคัดลอกลิงก์ได้

## Firebase ที่เชื่อมไว้

โปรเจกต์ `qrcode-47974` ตั้งค่าใน `.env.local` ซึ่งไม่เข้า Git ไม่จำเป็นต้องใช้ Firebase Analytics

สำหรับโปรเจกต์ใหม่ ให้คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าจาก **Project settings → General → Your apps → Web app → SDK setup and configuration → Config**

| Firebase config | ตัวแปรใน .env.local |
| --- | --- |
| apiKey | VITE_FIREBASE_API_KEY |
| authDomain | VITE_FIREBASE_AUTH_DOMAIN |
| projectId | VITE_FIREBASE_PROJECT_ID |
| storageBucket | VITE_FIREBASE_STORAGE_BUCKET |
| messagingSenderId | VITE_FIREBASE_MESSAGING_SENDER_ID |
| appId | VITE_FIREBASE_APP_ID |

ค่า config ของ Web SDK ระบุแอปฝั่งเว็บ การจำกัดสิทธิ์ข้อมูลใช้ Security Rules ห้ามใส่ service account/private key ในโค้ดหน้าเว็บ

### บริการที่ต้องเปิด

1. **Authentication → Sign-in method → Email/Password → Enable**
2. **Authentication → Settings → Authorized domains** เพิ่มโดเมนจริงของเว็บ และ `localhost` หากใช้ทดสอบในเครื่อง
3. **Firestore Database → Create database** ใช้ native database `(default)` แล้วเผยแพร่ `firestore.rules`
4. **Storage → Get started** แล้วเผยแพร่ `storage.rules`

Cloud Storage for Firebase ต้องใช้แผน Blaze ที่ผูก billing ตาม [เอกสาร Firebase Storage](https://firebase.google.com/docs/storage/web/start) การใส่ `storageBucket` ใน config อย่างเดียวไม่ได้สร้าง bucket ให้

### เผยแพร่ Rules

Rules สำหรับฐานข้อมูล: `firestore.rules` วางใน **Firestore Database → Rules → Publish**

Rules สำหรับรูปภาพ: `storage.rules` วางใน **Storage → Rules → Publish**

หรือใช้ CLI:

```powershell
npx firebase login
npx firebase deploy --only "firestore:rules,storage" --project qrcode-47974
```

โครงสร้างข้อมูล:

```text
Firestore
items/{itemId}                    ข้อมูลประกาศสาธารณะ ไม่มีเบอร์โทรหรือ LINE
items/{itemId}/private/contact    contactType และ contact สำหรับสมาชิกที่ยืนยันอีเมล

Storage
items/{ownerUid}/{itemId}.jpg      รูปประกาศ
```

Firestore จำกัดชนิด/ความยาวข้อมูล, ownerId ต้องตรงผู้ใช้, createdAt ต้องเป็น server timestamp, เจ้าของเปลี่ยนได้เฉพาะ status และปิดสิทธิ์เส้นทางอื่นทั้งหมด ข้อมูลประกาศกับข้อมูลติดต่อเขียนด้วย atomic batch

Rules บังคับโดเมนและ email_verified ที่ระดับข้อมูลด้วย ถึงแม้มีคนข้ามฟอร์มสมัครก็ไม่ได้สิทธิ์ TSU โดยอัตโนมัติ Firebase Authentication เองไม่ได้ปิดการสร้างบัญชีโดเมนอื่นที่เรียก API โดยตรง; บัญชีเหล่านั้นจะไม่มีสิทธิ์เขียน/อ่านข้อมูลติดต่อและเว็บจะออกจากระบบให้

### นำเว็บขึ้นออนไลน์และใช้ QR จริง

1. ตั้ง `VITE_PUBLIC_URL=https://qrcode-47974.web.app` หรือโดเมนจริงใน `.env.local`
2. รัน `npm run build`
3. เมื่อพร้อมเผยแพร่ รัน `npx firebase deploy --only hosting --project qrcode-47974`
4. เปิดเว็บออนไลน์แล้วดาวน์โหลด QR ใหม่

QR ที่ชี้ `localhost` เปิดได้เฉพาะเครื่องเดิม มือถือเครื่องอื่นต้องใช้โดเมนออนไลน์ HTTPS

## โหมดทดลอง

เมื่อไม่มี Firebase config เว็บใช้ประกาศตัวอย่าง 6 รายการและปุ่ม “ทดลองใช้งานโดยไม่สมัคร” ประกาศใหม่เก็บใน IndexedDB ของเบราว์เซอร์นั้น ไม่มีการสร้างบัญชีจริงหรือเก็บรหัสผ่าน เมื่อใส่ config แล้วจะใช้ข้อมูล Firebase แทน และไม่ย้ายประกาศทดลองไปออนไลน์อัตโนมัติ

## ตรวจสอบ

`npm test` ตรวจการค้นหาและตัวกรอง การป้องกัน HTML injection รูปภาพ ชนิดข้อมูล โดเมนอีเมล และการแปลงเบอร์ไทย ส่วนการสมัครจริง/รับอีเมล/อัปโหลด Firebase ต้องตรวจด้วยบัญชี TSU ที่ยืนยันอีเมลได้และ Storage ที่เปิดแล้ว

ตรวจสถานะ Email/Password ด้วยบัญชี Firebase CLI ที่ล็อกอินอยู่:

```powershell
node scripts/check-firebase.cjs
```

เอกสารอ้างอิง: [ตั้งค่า Web SDK](https://firebase.google.com/docs/web/setup), [Email/Password](https://firebase.google.com/docs/auth/web/password-auth), [Storage](https://firebase.google.com/docs/storage/web/start)
