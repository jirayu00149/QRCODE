import test from 'node:test';
import assert from 'node:assert/strict';
import { filterItems, escapeHtml, validateImage, validatePost, localDate, isAllowedEmail, normalizeThaiPhone } from '../src/utils.js';
const items = [
  { title: 'กระเป๋า น้ำตาล', description: 'หนัง', location: 'ห้องสมุด', type: 'found', status: 'open', category: 'wallet', ownerId: 'a', createdAt: 1 },
  { title: 'AirPods', description: 'สีขาว', location: 'โรงอาหาร', type: 'lost', status: 'open', category: 'electronics', ownerId: 'b', createdAt: 3 },
  { title: 'กุญแจ', description: 'รถ', location: 'ห้องสมุด', type: 'found', status: 'returned', category: 'keys', ownerId: 'a', createdAt: 2 },
];
test('only the exact TSU email domain is accepted', () => {
  assert.equal(isAllowedEmail('student@tsu.ac.th'), true);
  assert.equal(isAllowedEmail(' Student@TSU.AC.TH '), true);
  for (const email of ['student@gmail.com', 'student@tsu.ac.th.evil.com', 'student@sub.tsu.ac.th', 'a@@tsu.ac.th', '@tsu.ac.th']) assert.equal(isAllowedEmail(email), false);
});
test('Thai phone numbers normalize to +66 and reject other country codes', () => {
  assert.equal(normalizeThaiPhone('081-234-5678'), '+66812345678');
  assert.equal(normalizeThaiPhone('+66 81 234 5678'), '+66812345678');
  assert.equal(normalizeThaiPhone('02 123 4567'), '+6621234567');
  for (const phone of ['+1 2125551234', '+660812345678', '123', '+6681234567890', 'hello']) assert.throws(() => normalizeThaiPhone(phone));
});
test('search combines type, category, location and trimmed Thai text', () => {
  assert.equal(filterItems(items, { search: ' น้ำตาล ', location: 'ห้องสมุด', category: 'wallet' }).length, 1);
  assert.equal(filterItems(items, { search: 'น้ำตาล', category: 'electronics' }).length, 0);
  assert.equal(filterItems(items, { type: 'lost', search: 'airpods' }).length, 1);
});
test('returned items leave open feed; my posts includes both statuses in selected order', () => {
  assert.equal(filterItems(items).length, 1);
  assert.equal(filterItems(items, { type: 'returned' })[0].title, 'กุญแจ');
  assert.deepEqual(filterItems(items, { type: 'mine', uid: 'a' }).map(i => i.createdAt), [2, 1]);
  assert.deepEqual(filterItems(items, { type: 'mine', uid: 'a', sort: 'oldest' }).map(i => i.createdAt), [1, 2]);
  assert.equal(filterItems(items, { type: 'mine' }).length, 0);
});
test('user content is escaped for attributes and HTML', () => {
  assert.equal(escapeHtml('<img src="x" onerror=\'bad\'>&'), '&lt;img src=&quot;x&quot; onerror=&#39;bad&#39;&gt;&amp;');
});
test('reject oversized and active image types', () => {
  assert.throws(() => validateImage({ type: 'image/svg+xml', size: 100 }));
  assert.throws(() => validateImage({ type: 'image/jpeg', size: 6 * 1024 * 1024 }));
  assert.doesNotThrow(() => validateImage({ type: 'image/png', size: 100 }));
});
test('post validation rejects incomplete data and future dates', () => {
  const valid = { title: 'กุญแจ', description: 'พบบนโต๊ะ', location: 'โรงอาหาร', category: 'keys', type: 'found', contactType: 'line', contact: 'demo-line', date: localDate() };
  assert.doesNotThrow(() => validatePost(valid));
  assert.throws(() => validatePost({ ...valid, date: '2999-01-01' }));
  assert.throws(() => validatePost({ ...valid, contact: ' ' }));
  assert.throws(() => validatePost({ ...valid, type: 'invalid' }));
  assert.throws(() => validatePost({ ...valid, contactType: 'phone', contact: 'bad phone' }));
});
