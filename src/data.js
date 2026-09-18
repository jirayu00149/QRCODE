import { artUrl } from './art.js';
import { localDate } from './utils.js';
const examples = [
  ['wallet', 'กระเป๋าสตางค์สีน้ำตาล', 'wallet', 'ห้องสมุดกลาง', '#ece4d9', 'พบกระเป๋าสตางค์สีน้ำตาลบริเวณโต๊ะอ่านหนังสือ ชั้น 2 เจ้าของกรุณาบอกลักษณะหรือสิ่งของข้างในเพื่อยืนยันตัวตน'],
  ['earbuds', 'AirPods พร้อมเคสสีขาว', 'electronics', 'โรงอาหาร', '#e4e9e0', 'พบหูฟังพร้อมเคสวางอยู่บนโต๊ะใกล้ทางเข้า สามารถบอกชื่ออุปกรณ์ที่ตั้งไว้เพื่อยืนยันความเป็นเจ้าของได้'],
  ['keys', 'พวงกุญแจพร้อมสายหนัง', 'keys', 'อาคารเรียนรวม', '#f3e9d5', 'พบพวงกุญแจบริเวณม้านั่งหน้าอาคาร มีสายหนังสีน้ำตาลติดอยู่'],
  ['bag', 'กระเป๋าผ้าใบสีครีม', 'wallet', 'สนามกีฬา', '#eae5dd', 'พบกระเป๋าผ้าบริเวณอัฒจันทร์ กรุณาระบุสิ่งของภายในก่อนรับคืน'],
  ['bottle', 'กระบอกน้ำสีเขียว', 'personal', 'ห้องสมุดกลาง', '#e6eadd', 'พบกระบอกน้ำวางอยู่ที่จุดพักผ่อนหน้าห้องสมุด'],
  ['glasses', 'แว่นตากรอบสีน้ำตาล', 'personal', 'อาคารเรียนรวม', '#eee3d9', 'พบแว่นตาบริเวณห้องเรียนชั้น 1 เก็บไว้ให้แล้ว ติดต่อแจ้งรายละเอียดเพื่อรับคืน'],
];
export function demoItems() {
  return examples.map(([art, title, category, location, color, description], i) => ({
    id: `example-${i + 1}`, title, category, location, description,
    imageUrl: artUrl(art, color), type: 'found', status: 'open',
    ownerId: 'example', ownerName: 'สมาชิกคืนกัน', date: localDate(),
    createdAt: Date.now() - i * 3600000, example: true,
  }));
}
