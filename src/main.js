import './style.css';
import { createIcons, ArrowUpRight, ArrowRight, ArrowLeft, Search, Plus, QrCode, MapPin, CalendarDays, Grid2X2, Headphones, Wallet, KeyRound, Glasses, Shapes, Check, CheckCheck, Heart, X, Menu, LogOut, UserRound, Mail, LockKeyhole, Eye, EyeOff, ImagePlus, Upload, Download, Link, Copy, Phone, MessageCircle, ShieldCheck, CircleHelp, LoaderCircle, ChevronDown, PackageSearch, RotateCcw, Sparkles } from 'lucide';
import QRCode from 'qrcode';
import { heroArt } from './art.js';
import { categories, escapeHtml as esc, filterItems, formatDate, localDate, shareUrl, validateImage } from './utils.js';
import { configured, state, init, demoLogin, authenticate, logout, createPost, getContact, markReturned, errorMessage, canParticipate, sendVerification, checkVerification } from './service.js';

const iconSet = { ArrowUpRight, ArrowRight, ArrowLeft, Search, Plus, QrCode, MapPin, CalendarDays, Grid2X2, Headphones, Wallet, KeyRound, Glasses, Shapes, Check, CheckCheck, Heart, X, Menu, LogOut, UserRound, Mail, LockKeyhole, Eye, EyeOff, ImagePlus, Upload, Download, Link, Copy, Phone, MessageCircle, ShieldCheck, CircleHelp, LoaderCircle, ChevronDown, PackageSearch, RotateCcw, Sparkles };
const icon = (name, cls = '') => `<i data-lucide="${name}" ${cls ? `class="${cls}"` : ''}></i>`;
const refreshIcons = () => createIcons({ icons: iconSet, attrs: { 'stroke-width': 1.7, 'aria-hidden': 'true' } });
const filters = { type: 'found', category: 'all', search: '', location: '', sort: 'newest' };
let afterAuth = null, selectedFile = null, previewUrl = null, qrDownload = '', currentQrUrl = '', openedShared = false, toastTimer;

document.querySelector('#app').innerHTML = `
  <header class="header"><div class="container header-inner">
    <a href="/" class="brand" aria-label="คืนกัน หน้าหลัก"><img src="/favicon.svg" alt=""/><span>คืนกัน<small>LOST & FOUND</small></span></a>
    <nav class="desktop-nav" aria-label="เมนูหลัก"><a class="active" href="#browse">ค้นหาของหาย</a><a href="#how-it-works">ใช้งานอย่างไร</a><button class="text-button" data-action="qr">${icon('QrCode')} QR สำหรับแบ่งปัน</button></nav>
    <div id="account" class="account"></div>
  </div></header>
  <main>
    <section class="hero"><div class="container hero-inner">
      <div class="hero-copy"><div class="eyebrow"><span></span> ของหายอาจไม่ไกล แค่ยังหากันไม่เจอ</div>
        <h1>ช่วยของหาย<br/>ให้ได้<span class="accent-word">กลับบ้าน<svg viewBox="0 0 300 14"><path d="M3 10Q130-3 295 6"/></svg></span><span class="title-dot">.</span></h1>
        <p>พื้นที่เล็ก ๆ ที่เชื่อมคนทำหายกับคนที่พบ<br/>เพราะของธรรมดาของใคร อาจมีความหมายกับอีกคน</p>
        <div class="hero-actions"><button class="button primary" data-action="post">${icon('Plus')} ฉันพบของหาย</button><a class="button soft" href="#browse">ตามหาของของฉัน ${icon('ArrowUpRight')}</a></div>
        <div class="hero-footnote"><span class="mini-heart">${icon('Heart')}</span> หนึ่งการแบ่งปัน อาจเป็นรอยยิ้มของใครสักคน</div>
      </div>${heroArt()}
    </div></section>
    <div class="container"><div class="steps-strip"><div><span class="step-icon">${icon('Search')}</span><span><b>เจอของที่ใครทำหาย?</b><small>ถ่ายรูป แล้วฝากประกาศไว้กับเรา</small></span></div><span class="step-line"></span><div><span class="step-icon">${icon('QrCode')}</span><span><b>สแกนง่าย หาเจอไว</b><small>เปิด QR แล้วดูรายการได้ทันที</small></span></div><span class="step-line"></span><div><span class="step-icon">${icon('Heart')}</span><span><b>ส่งคืน พร้อมส่งต่อความใจดี</b><small>ติดต่อกัน แล้วนัดรับของคืน</small></span></div></div></div>
    <section id="browse" class="browse container">
      <div class="section-heading"><div><div class="section-kicker">A LITTLE HELP, A HAPPY REUNION</div><h2>ของที่กำลังรอเจ้าของ <span class="tiny-spark">✳</span></h2><p>ลองมองหาดู ของที่คุณคิดถึงอาจอยู่ตรงนี้</p></div><button class="button outline small" data-action="post">${icon('Plus')} ลงประกาศ</button></div>
      <div class="tabs-row"><div class="tabs" role="tablist" aria-label="ประเภทประกาศ"><button class="tab active" role="tab" aria-selected="true" data-type="found">${icon('PackageSearch')} ของที่พบ <span id="found-count">0</span></button><button class="tab" role="tab" aria-selected="false" data-type="lost">${icon('Search')} กำลังตามหา</button><button class="tab" role="tab" aria-selected="false" data-type="returned">${icon('CheckCheck')} ส่งคืนแล้ว</button><button class="tab" role="tab" aria-selected="false" data-type="mine">${icon('UserRound')} ประกาศของฉัน</button></div><span class="public-note">${icon('ShieldCheck')} พื้นที่แห่งการช่วยเหลือ</span></div>
      <div class="search-row"><label class="search-field">${icon('Search')}<input id="search" type="search" placeholder="ค้นหาชื่อสิ่งของ ลักษณะ หรือสถานที่…" aria-label="ค้นหาสิ่งของ"/><kbd>ค้นหา</kbd></label><label class="location-filter">${icon('MapPin')}<select id="location" aria-label="กรองตามสถานที่"><option value="">ทุกสถานที่</option></select>${icon('ChevronDown')}</label></div>
      <div class="categories" aria-label="หมวดหมู่">${categories.map(c => `<button class="category ${c.id === 'all' ? 'selected' : ''}" data-category="${c.id}" aria-pressed="${c.id === 'all'}">${icon(c.icon)}${c.label}</button>`).join('')}</div>
      <div class="results-heading"><span id="results-count" role="status" aria-live="polite">กำลังโหลดรายการ…</span><label>เรียงตาม <select id="sort" aria-label="เรียงรายการ"><option value="newest">ล่าสุดก่อน</option><option value="oldest">เก่าสุดก่อน</option></select>${icon('ChevronDown')}</label></div>
      <div id="demo-notice"></div><div id="items-grid" class="items-grid"></div>
      <div class="list-bottom"><span>${icon('Heart')} ขอบคุณทุกความใจดีที่ช่วยให้ของได้กลับบ้าน</span></div>
    </section>
    <section class="container"><div class="qr-banner"><div class="qr-banner-icon">${icon('QrCode')}</div><div><span class="section-kicker">SCAN. FIND. REUNITE.</span><h2>สแกนเดียว อาจเจอของที่ตามหา</h2><p>แชร์ QR นี้ให้เพื่อน หรือติดไว้ในพื้นที่ส่วนกลาง เพื่อให้เจ้าของหาเจอได้ง่ายขึ้น</p></div><button class="button primary" data-action="qr">${icon('QrCode')} รับ QR ของเว็บไซต์ ${icon('ArrowUpRight')}</button><span class="banner-flower">✳</span></div></section>
    <section id="how-it-works" class="how container"><div class="section-kicker">GOOD THINGS START WITH YOU</div><h2>คืนของให้กัน ง่ายกว่าที่คิด</h2><div class="how-grid"><article><span>01</span><h3>พบแล้ว ถ่ายรูปไว้</h3><p>เข้าสู่ระบบ อัปโหลดรูป ใส่สถานที่ที่พบ<br/>และช่องทางที่เจ้าของติดต่อคุณได้</p></article><article><span>02</span><h3>ตามหาผ่านหน้าเว็บ</h3><p>สแกน QR หรือค้นหาจากชื่อและหมวดหมู่<br/>เปิดดูรายละเอียดของที่คุ้นเคย</p></article><article><span>03</span><h3>ติดต่อ แล้วส่งคืน</h3><p>ยืนยันรายละเอียดกับผู้พบ นัดรับของคืน<br/>และเปลี่ยนสถานะเมื่อของถึงเจ้าของแล้ว</p></article></div></section>
  </main>
  <footer><div class="container footer-inner"><a href="/" class="brand"><img src="/favicon.svg" alt=""/><span>คืนกัน<small>LOST & FOUND</small></span></a><p>ให้ของได้กลับบ้าน ให้ความใจดีได้เดินทาง</p><span>Made with ${icon('Heart')} for everyone</span></div></footer>
  <dialog id="modal" aria-labelledby="modal-title"><div id="modal-content"></div></dialog>`;

const modal = document.querySelector('#modal');
function toast(message) {
  const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4500);
}
function showModal(html, wide = false) {
  modal.classList.toggle('wide', wide);
  document.querySelector('#modal-content').innerHTML = `<button class="close-button icon-button" data-action="close" aria-label="ปิดหน้าต่าง">${icon('X')}</button>${html}`;
  if (!modal.open) modal.showModal();
  modal.scrollTop = 0;
  refreshIcons();
}
function closeModal() { modal.close(); if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; } }
function renderAccount() {
  document.querySelector('#account').innerHTML = state.user
    ? `<button class="user-chip" data-action="my-posts">${icon('UserRound')}<span>${esc(state.user.displayName || 'สมาชิก')}</span></button><button class="icon-button" data-action="logout" aria-label="ออกจากระบบ" title="ออกจากระบบ">${icon('LogOut')}</button>`
    : `<button class="login-button" data-action="login">เข้าสู่ระบบ</button><button class="button primary small" data-action="register">สมัครสมาชิก ${icon('ArrowUpRight')}</button>`;
}
function renderItems() {
  const items = filterItems(state.items, { ...filters, uid: state.user?.uid });
  document.querySelector('#found-count').textContent = state.items.filter(i => i.type === 'found' && i.status === 'open').length;
  document.querySelector('#results-count').innerHTML = state.loading ? 'กำลังโหลดรายการ…' : `พบ <b>${items.length}</b> รายการ${!configured ? ' <span class="results-context">· โหมดทดลอง</span>' : ' <span class="results-context">· จากประกาศล่าสุดสูงสุด 200 รายการ</span>'}`;
  document.querySelector('#demo-notice').innerHTML = !configured ? `<div class="demo-notice">${icon('Sparkles')} โหมดทดลอง — ประกาศใหม่บันทึกเฉพาะเบราว์เซอร์นี้ รูปที่มีป้าย “ตัวอย่าง” ใช้สาธิตการทำงาน</div>` : '';
  const grid = document.querySelector('#items-grid');
  if (state.loading) grid.innerHTML = `<div class="empty-state">${icon('LoaderCircle', 'spin')}<h3>กำลังตามหาของให้คุณ…</h3></div>`;
  else if (state.error) grid.innerHTML = `<div class="empty-state">${icon('CircleHelp')}<h3>โหลดข้อมูลไม่สำเร็จ</h3><p>${esc(state.error)}</p><button class="button outline" data-action="reload">ลองใหม่</button></div>`;
  else if (filters.type === 'mine' && !state.user) grid.innerHTML = `<div class="empty-state">${icon('UserRound')}<h3>รวมประกาศของคุณไว้ที่นี่</h3><p>เข้าสู่ระบบเพื่อดูประกาศและอัปเดตสถานะการส่งคืน</p><button class="button primary" data-action="login">เข้าสู่ระบบ</button></div>`;
  else if (!items.length) grid.innerHTML = `<div class="empty-state">${icon('PackageSearch')}<h3>${filters.search || filters.category !== 'all' || filters.location ? 'ยังไม่พบสิ่งของที่ตรงกับการค้นหา' : 'ยังไม่มีประกาศในหมวดนี้'}</h3><p>ลองเปลี่ยนคำค้น หรือฝากประกาศไว้ให้คนอื่นช่วยตามหา</p><div><button class="button outline" data-action="reset-filters">ล้างตัวกรอง</button><button class="button primary" data-action="post">${icon('Plus')} ลงประกาศ</button></div></div>`;
  else grid.innerHTML = items.map(item => `<button class="item-card" data-item="${esc(item.id)}" aria-label="ดูรายละเอียด ${esc(item.title)}"><div class="item-image"><img src="${esc(item.imageUrl)}" alt="${esc(item.title)}" loading="lazy"/><span class="status-badge ${item.status === 'returned' ? 'returned' : item.type === 'lost' ? 'lost' : ''}"><span></span>${item.status === 'returned' ? 'ส่งคืนแล้ว' : item.type === 'lost' ? 'กำลังตามหา' : 'พบของ · รอเจ้าของ'}</span>${item.example ? '<span class="example-badge">ตัวอย่าง</span>' : ''}<span class="card-arrow">${icon('ArrowUpRight')}</span></div><div class="item-body"><span class="item-category">${esc(categories.find(c => c.id === item.category)?.label || 'อื่น ๆ')}</span><h3>${esc(item.title)}</h3><div class="item-location">${icon('MapPin')} ${esc(item.location)}</div><div class="item-bottom"><span>${icon('CalendarDays')} ${formatDate(item.date)}</span><span>ดูรายละเอียด ${icon('ArrowRight')}</span></div></div></button>`).join('');
  refreshIcons();
}
function render() {
  renderAccount();
  const locations = [...new Set(state.items.map(i => i.location))].sort();
  document.querySelector('#location').innerHTML = `<option value="">ทุกสถานที่</option>${locations.map(l => `<option value="${esc(l)}" ${filters.location === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}`;
  renderItems();
  if (!state.loading && !state.error && !openedShared) {
    openedShared = true;
    const id = new URLSearchParams(location.search).get('item');
    if (id) { if (state.items.some(i => i.id === id)) showDetail(id); else toast('ไม่พบประกาศนี้ อาจถูกลบหรือเป็นประกาศทดลองจากเครื่องอื่น'); }
  }
}
function switchTab(type) {
  filters.type = type;
  document.querySelectorAll('[data-type]').forEach(el => { el.classList.toggle('active', el.dataset.type === type); el.setAttribute('aria-selected', String(el.dataset.type === type)); });
  renderItems();
}
function showAuth(mode = 'login', callback) {
  if (callback) afterAuth = callback;
  const register = mode === 'register', reset = mode === 'reset';
  showModal(`<div class="auth-header"><img src="/favicon.svg" alt=""/><div class="section-kicker">WELCOME TO KHUENKAN</div><h2 id="modal-title">${register ? 'เริ่มต้นส่งต่อความใจดี' : reset ? 'ตั้งรหัสผ่านใหม่' : 'ยินดีที่ได้พบกันอีกครั้ง'}</h2><p>${register ? 'สร้างบัญชี เพื่อช่วยให้ของหายได้กลับบ้าน' : reset ? 'เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้ทางอีเมล' : 'เข้าสู่ระบบเพื่อลงประกาศและติดต่อเจ้าของประกาศ'}</p></div>
    <form id="auth-form" data-mode="${mode}" class="form">
      ${register ? '<label>ชื่อที่แสดง<input name="name" placeholder="ชื่อของคุณ" autocomplete="name" maxlength="60" required/></label>' : ''}
      <label>อีเมลมหาวิทยาลัย (@tsu.ac.th)<div class="input-icon">${icon('Mail')}<input name="email" type="email" placeholder="yourname@tsu.ac.th" autocomplete="email" pattern="[^@\\s]+@[tT][sS][uU]\\.[aA][cC]\\.[tT][hH]" title="ใช้อีเมล @tsu.ac.th เท่านั้น" required/></div></label>
      ${!reset ? `<label>รหัสผ่าน<div class="input-icon">${icon('LockKeyhole')}<input name="password" type="password" placeholder="${register ? 'อย่างน้อย 8 ตัวอักษร' : 'กรอกรหัสผ่านของคุณ'}" minlength="${register ? 8 : 1}" autocomplete="${register ? 'new-password' : 'current-password'}" required/><button type="button" class="icon-button password-toggle" data-action="toggle-password" aria-label="แสดงรหัสผ่าน">${icon('Eye')}</button></div></label>` : ''}
      ${register ? '<label class="checkbox-label"><input type="checkbox" required/>ฉันจะใช้พื้นที่นี้เพื่อช่วยตามหาและส่งคืนสิ่งของ</label>' : !reset ? '<button type="button" class="text-link forgot" data-action="reset-password">ลืมรหัสผ่าน?</button>' : ''}
      <p class="form-error" role="alert"></p><button class="button primary full" type="submit">${register ? 'สมัครสมาชิก' : reset ? 'ส่งลิงก์ตั้งรหัสผ่าน' : 'เข้าสู่ระบบ'} ${icon('ArrowRight')}</button>
    </form><p class="auth-switch">${register ? 'มีบัญชีอยู่แล้ว?' : reset ? 'จำรหัสผ่านได้แล้ว?' : 'ยังไม่เคยใช้คืนกัน?'} <button class="text-link" data-action="${register || reset ? 'login' : 'register'}">${register || reset ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</button></p>
    ${!configured ? `<div class="demo-auth"><p>ขณะนี้เป็นโหมดทดลอง ยังไม่ได้เชื่อม Firebase<br/>ไม่ต้องกรอกข้อมูลส่วนตัวเพื่อทดลองใช้งาน</p><button class="button soft full" data-action="demo-login">${icon('Sparkles')} ทดลองใช้งานโดยไม่สมัคร</button></div>` : ''}`);
}
function showPost() {
  if (!state.user) return showAuth('login', showPost);
  if (!canParticipate()) return showVerify(showPost);
  selectedFile = null;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  showModal(`<div class="modal-heading"><div class="section-kicker">A SMALL ACT OF KINDNESS</div><h2 id="modal-title">ฝากประกาศไว้กับคืนกัน</h2><p>รายละเอียดเล็ก ๆ ช่วยให้เจ้าของตามหาเจอได้ง่ายขึ้น</p></div><form id="post-form" class="form">
    <fieldset class="post-type"><legend class="sr-only">ประเภทประกาศ</legend><label><input type="radio" name="type" value="found" ${filters.type !== 'lost' ? 'checked' : ''}/>${icon('PackageSearch')} ฉันพบของ</label><label><input type="radio" name="type" value="lost" ${filters.type === 'lost' ? 'checked' : ''}/>${icon('Search')} ฉันทำของหาย</label></fieldset>
    <label class="upload-zone" id="upload-zone"><input type="file" id="post-image" accept="image/jpeg,image/png,image/webp" required/><span id="upload-content">${icon('ImagePlus')}<b>เพิ่มรูปสิ่งของ</b><small>คลิกเพื่อเลือก หรือลากรูปมาวาง · JPG, PNG, WebP ไม่เกิน 5 MB</small></span></label>
    <label>ชื่อสิ่งของ<input name="title" placeholder="เช่น กระเป๋าสตางค์สีน้ำตาล" maxlength="100" required/></label>
    <div class="form-row"><label>หมวดหมู่<select name="category" required><option value="">เลือกหมวดหมู่</option>${categories.slice(1).map(c => `<option value="${c.id}">${c.label}</option>`).join('')}</select></label><label>วันที่พบ / วันที่หาย<input type="date" name="date" value="${localDate()}" max="${localDate()}" required/></label></div>
    <label>สถานที่<input name="location" placeholder="เช่น ห้องสมุดกลาง ชั้น 2" maxlength="150" required/></label>
    <label>รายละเอียด<textarea name="description" rows="3" placeholder="ลักษณะสิ่งของ จุดที่พบ หรือข้อมูลที่ช่วยให้ตามหาเจอ" maxlength="1500" required></textarea></label>
    <div class="contact-section"><h3>${icon('MessageCircle')} ช่องทางติดต่อ</h3><p>แสดงเฉพาะสมาชิกที่ยืนยันอีเมล @tsu.ac.th แล้ว · เบอร์โทรใช้รหัสประเทศ +66</p><div class="form-row contact-row"><label>ช่องทาง<select name="contactType"><option value="line">LINE ID</option><option value="phone">เบอร์โทรศัพท์ (+66)</option><option value="email">อีเมล @tsu.ac.th</option></select></label><label>ข้อมูลติดต่อ<input name="contact" placeholder="กรอก LINE ID ของคุณ" maxlength="200" required/></label></div></div>
    <label class="checkbox-label"><input type="checkbox" required/>ยินยอมแสดงรูปและรายละเอียดประกาศบนเว็บไซต์</label><p class="form-error" role="alert"></p><button type="submit" class="button primary full">${icon('Plus')} เผยแพร่ประกาศ${!configured ? 'ทดลอง' : ''}</button>
  </form>`, true);
  const input = document.querySelector('#post-image');
  document.querySelector('[name="contactType"]').addEventListener('change', event => {
    const contactInput = document.querySelector('[name="contact"]');
    const type = event.target.value;
    contactInput.type = type === 'phone' ? 'tel' : type === 'email' ? 'email' : 'text';
    contactInput.placeholder = type === 'phone' ? '+66 81 234 5678' : type === 'email' ? 'yourname@tsu.ac.th' : 'กรอก LINE ID ของคุณ';
    contactInput.value = type === 'phone' ? '+66 ' : '';
  });
  input.addEventListener('change', () => selectImage(input.files[0]));
  const zone = document.querySelector('#upload-zone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag-over'); if (e.dataTransfer.files.length) { input.files = e.dataTransfer.files; selectImage(input.files[0]); } });
}
function selectImage(file) {
  try {
    validateImage(file); selectedFile = file;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    document.querySelector('#upload-content').innerHTML = `<img class="upload-preview" src="${previewUrl}" alt="รูปสิ่งของที่เลือก"/><small>${esc(file.name)} · คลิกเพื่อเปลี่ยนรูป</small>`;
  } catch (error) { selectedFile = null; document.querySelector('#post-image').value = ''; document.querySelector('#upload-content').innerHTML = `${icon('ImagePlus')}<b>เลือกรูปภาพใหม่</b><small>JPG, PNG, WebP ไม่เกิน 5 MB</small>`; refreshIcons(); toast(errorMessage(error)); }
}
function showDetail(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return toast('ไม่พบประกาศนี้');
  showModal(`<div class="detail-image"><img src="${esc(item.imageUrl)}" alt="${esc(item.title)}"/>${item.example ? '<span class="example-badge">ประกาศตัวอย่าง</span>' : ''}</div><div class="detail-content"><div class="detail-top"><span class="item-category">${esc(categories.find(c => c.id === item.category)?.label || 'อื่น ๆ')}</span><span class="detail-status">${item.status === 'returned' ? '✓ ส่งคืนแล้ว' : item.type === 'found' ? '● พบของ · รอเจ้าของ' : '● กำลังตามหา'}</span></div><h2 id="modal-title">${esc(item.title)}</h2><div class="detail-meta"><span>${icon('MapPin')} ${esc(item.location)}</span><span>${icon('CalendarDays')} ${formatDate(item.date)}</span></div><p class="description">${esc(item.description)}</p><div class="posted-by">${icon('UserRound')} ลงประกาศโดย ${esc(item.ownerName)}</div><div class="safety-note">${icon('ShieldCheck')} ยืนยันรายละเอียดสิ่งของก่อนรับคืน และนัดพบในพื้นที่สาธารณะ</div><div id="contact-panel"></div><div class="detail-actions"><button class="button primary" data-action="contact" data-id="${esc(id)}">${icon('MessageCircle')} ${state.user ? 'ดูช่องทางติดต่อ' : 'เข้าสู่ระบบเพื่อติดต่อ'}</button><button class="button outline" data-action="item-qr" data-id="${esc(id)}">${icon('QrCode')} แชร์</button></div>${state.user?.uid === item.ownerId && item.status === 'open' ? `<button class="button soft full return-button" data-action="confirm-return" data-id="${esc(id)}">${icon('CheckCheck')} ยืนยันว่าได้รับคืน / ส่งคืนแล้ว</button>` : ''}</div>`, true);
}
async function showContact(id) {
  if (!state.user) return showAuth('login', () => { showDetail(id); showContact(id); });
  if (!canParticipate()) return showVerify(() => { showDetail(id); showContact(id); });
  const item = state.items.find(i => i.id === id);
  const button = document.querySelector('[data-action="contact"]');
  if (button) button.disabled = true;
  try {
    const data = await getContact(item);
    const panel = document.querySelector('#contact-panel');
    if (!panel || !data) return;
    panel.innerHTML = `<div class="contact-result"><span>${data.contactType === 'phone' ? 'เบอร์โทรศัพท์' : data.contactType === 'line' ? 'LINE ID' : data.contactType === 'email' ? 'อีเมล' : 'ข้อมูลทดลอง'}</span><b>${esc(data.contact)}</b>${data.contactType !== 'example' ? `<button class="text-link" data-action="copy-contact" data-value="${esc(data.contact)}">${icon('Copy')} คัดลอก</button>` : ''}</div>`;
    refreshIcons();
  } catch (error) { toast(errorMessage(error)); }
  finally { if (button) button.disabled = false; }
}
async function showQr(id) {
  const item = id ? state.items.find(i => i.id === id) : null;
  currentQrUrl = shareUrl(id);
  showModal(`<div class="qr-modal"><div class="section-kicker">PASS A LITTLE KINDNESS ON</div><h2 id="modal-title">${item ? 'แบ่งปันประกาศนี้' : 'สแกน แล้วมาคืนกัน'}</h2><p>${item ? esc(item.title) : 'ให้ใครอีกคนได้เจอของที่กำลังตามหา'}</p><div id="qr-image" class="qr-image" aria-live="polite">กำลังสร้าง QR…</div><div class="qr-brand">คืนกัน <span>LOST & FOUND</span></div><p class="qr-help">เปิดกล้องมือถือ แล้วสแกนเพื่อดู${item ? 'ประกาศ' : 'รายการสิ่งของ'}</p><input class="qr-url" value="${esc(currentQrUrl)}" readonly aria-label="ลิงก์สำหรับ QR"/><div class="qr-actions"><button class="button primary" data-action="download-qr" disabled>${icon('Download')} บันทึก QR</button><button class="button outline" data-action="copy-link">${icon('Link')} คัดลอกลิงก์</button></div>${['localhost', '127.0.0.1', '0.0.0.0'].includes(new URL(currentQrUrl).hostname) ? '<p class="local-warning">QR นี้ใช้ทดสอบในเครื่อง ต้องนำเว็บขึ้นออนไลน์และตั้ง VITE_PUBLIC_URL ก่อนแชร์ให้มือถือเครื่องอื่น</p>' : ''}${!configured && item && !item.example ? '<p class="local-warning">ประกาศทดลองอยู่เฉพาะเบราว์เซอร์นี้ เครื่องอื่นจะยังไม่เห็นประกาศ</p>' : ''}</div>`);
  try {
    qrDownload = await QRCode.toDataURL(currentQrUrl, { width: 1000, margin: 3, color: { dark: '#174f43', light: '#ffffff' }, errorCorrectionLevel: 'M' });
    const el = document.querySelector('#qr-image');
    if (el) { el.innerHTML = `<img src="${qrDownload}" alt="QR code สำหรับเปิด${item ? 'ประกาศ' : 'เว็บไซต์คืนกัน'}"/>`; document.querySelector('[data-action="download-qr"]').disabled = false; }
  } catch { toast('สร้าง QR ไม่สำเร็จ กรุณาลองอีกครั้ง'); }
}
async function copy(value) {
  try { await navigator.clipboard.writeText(value); toast('คัดลอกแล้ว'); }
  catch { toast('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกลิงก์หรือข้อความแล้วคัดลอก'); }
}
function showVerify(callback) {
  if (callback) afterAuth = callback;
  showModal(`<div class="auth-header"><img src="/favicon.svg" alt=""/><div class="section-kicker">VERIFY YOUR TSU EMAIL</div><h2 id="modal-title">ยืนยันอีเมลมหาวิทยาลัย</h2><p>เปิดอีเมลที่ส่งไปยัง <b>${esc(state.user?.email)}</b><br/>กดลิงก์ยืนยัน แล้วกลับมากดปุ่มด้านล่าง<br/>เพื่อเริ่มลงประกาศและติดต่อสมาชิก</p></div><div class="form"><button class="button primary full" data-action="check-verification">${icon('CheckCheck')} ยืนยันอีเมลแล้ว ตรวจสอบอีกครั้ง</button><button class="button outline full" data-action="resend-verification">${icon('Mail')} ส่งอีเมลยืนยันอีกครั้ง</button><p class="auth-switch">ไม่พบอีเมล? ลองตรวจสอบโฟลเดอร์จดหมายขยะ</p></div>`);
}

document.addEventListener('click', async event => {
  const tab = event.target.closest('[data-type]');
  if (tab) switchTab(tab.dataset.type);
  const category = event.target.closest('[data-category]');
  if (category) { filters.category = category.dataset.category; document.querySelectorAll('[data-category]').forEach(el => { el.classList.toggle('selected', el === category); el.setAttribute('aria-pressed', String(el === category)); }); renderItems(); }
  const card = event.target.closest('[data-item]');
  if (card) showDetail(card.dataset.item);
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  try {
    if (action === 'close') { afterAuth = null; closeModal(); }
    if (action === 'login' || action === 'register') showAuth(action);
    if (action === 'reset-password') showAuth('reset');
    if (action === 'post') showPost();
    if (action === 'resend-verification') { button.disabled = true; await sendVerification(); toast('ส่งอีเมลยืนยันแล้ว กรุณาตรวจสอบกล่องจดหมาย'); button.disabled = false; }
    if (action === 'check-verification') { button.disabled = true; if (await checkVerification()) { closeModal(); const callback = afterAuth; afterAuth = null; callback?.(); toast('ยืนยันอีเมลเรียบร้อย'); } else { toast('ยังไม่พบการยืนยัน กรุณากดลิงก์ในอีเมลก่อน'); button.disabled = false; } }
    if (action === 'qr' || action === 'item-qr') await showQr(id);
    if (action === 'demo-login') { demoLogin(); closeModal(); const callback = afterAuth; afterAuth = null; callback?.(); toast('เข้าสู่โหมดทดลองแล้ว ข้อมูลบันทึกเฉพาะเบราว์เซอร์นี้'); }
    if (action === 'logout') { await logout(); closeModal(); toast('ออกจากระบบแล้ว'); }
    if (action === 'my-posts') { switchTab('mine'); document.querySelector('#browse').scrollIntoView({ behavior: 'smooth' }); }
    if (action === 'toggle-password') { const input = button.parentElement.querySelector('input'); const visible = input.type === 'password'; input.type = visible ? 'text' : 'password'; button.setAttribute('aria-label', visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'); button.innerHTML = icon(visible ? 'EyeOff' : 'Eye'); refreshIcons(); }
    if (action === 'contact') await showContact(id);
    if (action === 'copy-contact') await copy(button.dataset.value);
    if (action === 'confirm-return') { button.disabled = true; await markReturned(id); showDetail(id); toast('อัปเดตเป็นส่งคืนแล้ว ขอบคุณที่ช่วยเหลือกัน'); }
    if (action === 'copy-link') await copy(currentQrUrl);
    if (action === 'download-qr' && qrDownload) { const a = document.createElement('a'); a.href = qrDownload; a.download = 'khuenkan-qr.png'; a.click(); }
    if (action === 'reload') window.location.reload();
    if (action === 'reset-filters') { filters.search = ''; filters.category = 'all'; filters.location = ''; document.querySelector('#search').value = ''; document.querySelector('#location').value = ''; document.querySelector('[data-category="all"]').click(); }
  } catch (error) { button.disabled = false; toast(errorMessage(error)); }
});
document.addEventListener('submit', async event => {
  if (!['auth-form', 'post-form'].includes(event.target.id)) return;
  event.preventDefault();
  const form = event.target, submit = form.querySelector('[type="submit"]'), errorEl = form.querySelector('.form-error');
  const oldContent = submit.innerHTML;
  submit.disabled = true; submit.innerHTML = `${icon('LoaderCircle', 'spin')} กำลังดำเนินการ…`; errorEl.textContent = ''; refreshIcons();
  try {
    const values = Object.fromEntries(new FormData(form));
    for (const key of Object.keys(values)) if (key !== 'password' && typeof values[key] === 'string') values[key] = values[key].trim();
    if (form.id === 'auth-form') {
      if (form.dataset.mode === 'register' && !values.name) throw new Error('กรุณาระบุชื่อที่แสดง');
      await authenticate(form.dataset.mode, values);
      if (form.dataset.mode === 'reset') { showAuth('login'); toast('ส่งคำขอแล้ว หากมีบัญชีนี้ กรุณาตรวจสอบอีเมล'); }
      else { closeModal(); renderAccount(); const callback = afterAuth; afterAuth = null; if (!canParticipate()) showVerify(callback); else callback?.(); toast(form.dataset.mode === 'register' ? 'สมัครสมาชิกแล้ว กรุณายืนยันอีเมล @tsu.ac.th' : 'เข้าสู่ระบบเรียบร้อย'); }
    } else {
      await createPost(values, selectedFile);
      closeModal(); filters.search = ''; filters.location = ''; filters.category = 'all'; document.querySelector('#search').value = ''; document.querySelector('#location').value = ''; document.querySelector('[data-category="all"]').click(); switchTab('mine'); document.querySelector('#browse').scrollIntoView({ behavior: 'smooth' }); toast('ลงประกาศเรียบร้อย ขอบคุณที่ช่วยส่งต่อความใจดี');
    }
  } catch (error) { errorEl.textContent = errorMessage(error); }
  finally { submit.disabled = false; submit.innerHTML = oldContent; refreshIcons(); }
});
document.querySelector('#search').addEventListener('input', e => { filters.search = e.target.value; renderItems(); });
document.querySelector('#location').addEventListener('change', e => { filters.location = e.target.value; renderItems(); });
document.querySelector('#sort').addEventListener('change', e => { filters.sort = e.target.value; renderItems(); });
modal.addEventListener('click', e => { if (e.target === modal) { const r = modal.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { afterAuth = null; closeModal(); } } });
modal.addEventListener('cancel', () => { afterAuth = null; });
refreshIcons(); renderAccount(); init(render);
