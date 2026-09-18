// Public upload configuration only. Never put a Cloudinary API secret in VITE_*.
export function cloudinaryConfig(env) {
  const cloudName = (env.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
  const uploadPreset = (env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim();
  if (!/^[a-z0-9_-]{1,100}$/.test(cloudName) || !/^[\w-]{1,200}$/.test(uploadPreset)) {
    throw new Error('ระบบเก็บรูปยังไม่พร้อม: กรุณาตั้งค่า Cloud name และ Upload preset ของ Cloudinary');
  }
  return { cloudName, uploadPreset };
}

export function validateUploadResult(data, cloudName) {
  if (data.resource_type !== 'image' || data.type !== 'upload' || data.format !== 'jpg'
    || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(data.public_id || '')
    || data.public_id.length > 500) throw new Error('ข้อมูลรูปภาพที่ได้รับจาก Cloudinary ไม่ถูกต้อง');
  const url = new URL(data.secure_url);
  const expectedPath = `/${cloudName}/image/upload/v${data.version}/${data.public_id}.jpg`;
  if (!Number.isSafeInteger(data.version) || data.version < 1 || url.protocol !== 'https:'
    || url.hostname !== 'res.cloudinary.com' || url.port || url.username || url.password
    || url.pathname !== expectedPath || url.search || url.hash) throw new Error('ลิงก์รูปภาพไม่ตรงกับบัญชี Cloudinary ที่ตั้งไว้');
  return { imageUrl: url.href, imagePath: data.public_id, deleteToken: typeof data.delete_token === 'string' ? data.delete_token : null };
}

export async function uploadImage(blob, env, fetcher = fetch) {
  const { cloudName, uploadPreset } = cloudinaryConfig(env);
  if (blob.type !== 'image/jpeg' || blob.size > 5 * 1024 * 1024 || blob.size === 0) throw new Error('กรุณาใช้รูป JPEG ขนาดไม่เกิน 5 MB');
  const body = new FormData();
  body.append('file', blob, 'found-item.jpg');
  body.append('upload_preset', uploadPreset);
  let response;
  try {
    response = await fetcher(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body, signal: AbortSignal.timeout(45000) });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new Error('อัปโหลดใช้เวลานานเกินไป กรุณาลองใหม่');
    throw new Error('เชื่อมต่อระบบเก็บรูปไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต');
  }
  if (!response.ok) {
    if (response.status === 413) throw new Error('รูปภาพมีขนาดเกินที่ระบบรับได้');
    if (response.status === 429 || response.status === 420) throw new Error('ระบบเก็บรูปถึงขีดจำกัดการใช้งาน กรุณาลองใหม่ภายหลัง');
    if ([400, 401, 403].includes(response.status)) throw new Error('อัปโหลดไม่ได้ กรุณาตรวจสอบ Cloudinary Upload preset และโควตาบัญชี');
    throw new Error('ระบบเก็บรูปขัดข้อง กรุณาลองใหม่ภายหลัง');
  }
  let data;
  try { data = await response.json(); }
  catch { throw new Error('ระบบเก็บรูปส่งข้อมูลกลับมาไม่สมบูรณ์ กรุณาลองใหม่'); }
  return validateUploadResult(data, cloudName);
}

// Only a short-lived token returned for this upload is used for cleanup.
// Enable return_delete_token in the preset if automatic rollback is wanted.
export async function removeUnpublishedImage(deleteToken, env, fetcher = fetch) {
  if (!deleteToken) return false;
  const { cloudName } = cloudinaryConfig(env);
  const body = new FormData(); body.append('token', deleteToken);
  try {
    const response = await fetcher(`https://api.cloudinary.com/v1_1/${cloudName}/delete_by_token`, { method: 'POST', body, signal: AbortSignal.timeout(10000) });
    return response.ok;
  } catch { return false; }
}
