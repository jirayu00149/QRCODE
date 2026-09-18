export const categories = [
  { id: 'all', label: 'ทั้งหมด', icon: 'Grid2X2' },
  { id: 'electronics', label: 'อุปกรณ์อิเล็กทรอนิกส์', icon: 'Headphones' },
  { id: 'wallet', label: 'กระเป๋า / กระเป๋าสตางค์', icon: 'Wallet' },
  { id: 'keys', label: 'กุญแจ', icon: 'KeyRound' },
  { id: 'personal', label: 'ของใช้ส่วนตัว', icon: 'Glasses' },
  { id: 'other', label: 'อื่น ๆ', icon: 'Shapes' },
];
export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const isAllowedEmail = value => /^[^\s@]+@tsu\.ac\.th$/i.test(String(value).trim());
export function normalizeThaiPhone(value) {
  let phone = String(value).replace(/[\s()-]/g, '');
  if (phone.startsWith('0')) phone = '+66' + phone.slice(1);
  if (!/^\+66[1-9]\d{7,8}$/.test(phone)) throw new Error('กรุณาใช้เบอร์ประเทศไทย เช่น +66812345678 หรือ 0812345678');
  return phone;
}
export function filterItems(items, { type = 'found', category = 'all', search = '', location = '', sort = 'newest', uid } = {}) {
  const term = search.trim().toLocaleLowerCase('th');
  return items.filter(item => {
    const typeMatch = type === 'mine' ? item.ownerId === uid : type === 'returned' ? item.status === 'returned' : item.type === type && item.status === 'open';
    return typeMatch && (category === 'all' || item.category === category)
      && (!location || item.location.includes(location))
      && (!term || `${item.title} ${item.description} ${item.location}`.toLocaleLowerCase('th').includes(term));
  }).sort((a, b) => sort === 'oldest' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt);
}
export function validateImage(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('กรุณาเลือกรูป JPG, PNG หรือ WebP');
  if (file.size > 5 * 1024 * 1024) throw new Error('รูปภาพต้องมีขนาดไม่เกิน 5 MB');
}
export function validatePost(data) {
  for (const [key, label, max] of [['title', 'ชื่อสิ่งของ', 100], ['location', 'สถานที่', 150], ['description', 'รายละเอียด', 1500], ['contact', 'ช่องทางติดต่อ', 200]]) {
    if (!data[key]?.trim() || data[key].length > max) throw new Error(`กรุณาระบุ${label} ไม่เกิน ${max} ตัวอักษร`);
  }
  if (!['found', 'lost'].includes(data.type)) throw new Error('กรุณาเลือกประเภทประกาศ');
  if (!categories.slice(1).some(c => c.id === data.category)) throw new Error('กรุณาเลือกหมวดหมู่');
  if (!['phone', 'line', 'email'].includes(data.contactType)) throw new Error('กรุณาเลือกช่องทางติดต่อ');
  if (data.contactType === 'phone') normalizeThaiPhone(data.contact);
  if (data.contactType === 'email' && !isAllowedEmail(data.contact)) throw new Error('กรุณาใช้อีเมล @tsu.ac.th เท่านั้น');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || Number.isNaN(Date.parse(data.date)) || data.date > localDate()) throw new Error('กรุณาระบุวันที่ไม่เกินวันนี้');
}
export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function formatDate(value) {
  return new Date(value).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function shareUrl(id) {
  const url = new URL(import.meta.env?.VITE_PUBLIC_URL || window.location.origin);
  url.search = '';
  url.hash = '';
  if (id) url.searchParams.set('item', id);
  return url.href;
}
