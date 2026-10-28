/* Free Apps Script web app. Deploy as owner, access: Anyone. No OAuth callback server. */
var GALLERY = { origin: 'https://samsvadba.github.io', maxBytes: 10 * 1024 * 1024, maxDaily: 500, pageSize: 18 };

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Bridge');
  template.channel = /^[a-f0-9]{48}$/.test(String(e.parameter.channel || '')) ? e.parameter.channel : '';
  return template.evaluate().setTitle('Simona & Martin – galéria')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// One allowlisted guest RPC. All privileged helpers are private to google.script.run.
function galleryCall(action, data) {
  try {
    data = data || {};
    if (action === 'status') { folder_(); return { ok: true, ready: true, maxFileBytes: GALLERY.maxBytes, maxBatchFiles: 20 }; }
    if (action === 'list') return { ok: true, result: list_(data.cursor) };
    if (action === 'upload') return { ok: true, result: upload_(data) };
    if (action === 'uploadStatus') {
      var saved = original_(data.id, folder_());
      return { ok: true, result: { photo: saved && saved.appProperties.state === 'ready' ? photo_(saved) : null } };
    }
    if (action === 'media') return { ok: true, result: media_(data.id, data.variant) };
    throw Error('DENIED');
  } catch (error) {
    var message = String(error.message || error);
    var known = /^(FILE_TOO_LARGE|UNSUPPORTED_TYPE|IMAGE_DECODE|DRIVE_QUOTA|RATE_LIMIT|DENIED|NOT_FOUND)$/;
    var code = known.test(message) ? message : /quota|storage|limit exceeded|for one day/i.test(message) ? 'DRIVE_QUOTA' : /too many|invoked too/i.test(message) ? 'RATE_LIMIT' : 'STORAGE';
    console.warn('Gallery failure: ' + code); // Never log photo bytes, names or tokens.
    return { ok: false, error: { code: code } };
  }
}

function folder_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('GALLERY_FOLDER_ID');
  if (!id) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) throw Error('RATE_LIMIT');
    try {
      id = props.getProperty('GALLERY_FOLDER_ID');
      if (!id) {
        var folder = Drive.Files.create({ name: 'Simona & Martin – svadobné fotografie', mimeType: 'application/vnd.google-apps.folder', appProperties: { weddingGallery: 'v1' } }, null, { fields: 'id' });
        id = folder.id; props.setProperty('GALLERY_FOLDER_ID', id);
      }
    } finally { lock.releaseLock(); }
  }
  var meta = Drive.Files.get(id, { fields: 'id,mimeType,appProperties,trashed' });
  if (meta.trashed || meta.mimeType !== 'application/vnd.google-apps.folder' || !meta.appProperties || meta.appProperties.weddingGallery !== 'v1') throw Error('DENIED');
  return id;
}

function query_(folder, extra) {
  return "'" + folder + "' in parents and trashed = false and appProperties has { key='weddingGallery' and value='v1' }" + (extra ? ' and ' + extra : '');
}
function original_(id, folder) {
  if (!/^[a-f0-9-]{36}$/.test(String(id))) throw Error('DENIED');
  var found = Drive.Files.list({ q: query_(folder, "appProperties has { key='uploadId' and value='" + id + "' } and appProperties has { key='role' and value='original' }"), pageSize: 2, fields: 'files(id,name,createdTime,appProperties)' }).files || [];
  return found[0] || null;
}
function photo_(file) { return { id: file.appProperties.uploadId, name: file.name }; }
function list_(cursor) {
  if (cursor && (typeof cursor !== 'string' || cursor.length > 2048)) throw Error('DENIED');
  var result = Drive.Files.list({ q: query_(folder_(), "appProperties has { key='role' and value='original' } and appProperties has { key='state' and value='ready' }"), orderBy: 'createdTime desc', pageSize: GALLERY.pageSize, pageToken: cursor || undefined, fields: 'nextPageToken,files(id,name,createdTime,appProperties)' });
  return { photos: (result.files || []).map(photo_), nextCursor: result.nextPageToken || null };
}
function bytes_(base64, limit) {
  if (typeof base64 !== 'string' || !base64 || base64.length > Math.ceil(limit / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw Error('FILE_TOO_LARGE');
  var bytes = Utilities.base64Decode(base64);
  if (!bytes.length || bytes.length > limit) throw Error('FILE_TOO_LARGE');
  return bytes;
}
function detect_(bytes) {
  function u(i) { return bytes[i] & 255; }
  function text(a,b) { return bytes.slice(a,b).map(function(v){ return String.fromCharCode(v & 255); }).join(''); }
  if (u(0) === 255 && u(1) === 216 && u(2) === 255) return 'image/jpeg';
  if (text(1,4) === 'PNG' && u(0) === 137 && u(4) === 13 && u(5) === 10 && u(6) === 26 && u(7) === 10) return 'image/png';
  if (text(0,4) === 'RIFF' && text(8,12) === 'WEBP') return 'image/webp';
  if (text(4,8) === 'ftyp' && /heic|heix|hevc|hevx|mif1|msf1/.test(text(8,Math.min(bytes.length,64)))) return 'image/heic';
  throw Error('UNSUPPORTED_TYPE');
}
function jpeg_(base64, maxSide, limit) {
  var bytes = bytes_(base64, limit);
  if (detect_(bytes) !== 'image/jpeg' || (bytes[bytes.length - 2] & 255) !== 255 || (bytes[bytes.length - 1] & 255) !== 217) throw Error('IMAGE_DECODE');
  var i = 2, dimensions = null;
  while (i + 8 < bytes.length) {
    if ((bytes[i++] & 255) !== 255) throw Error('IMAGE_DECODE');
    var marker = bytes[i++] & 255;
    if (marker === 255) { i--; continue; }
    if (marker === 218 || marker === 217) break;
    var size = ((bytes[i] & 255) << 8) | (bytes[i + 1] & 255);
    if (size < 2 || i + size > bytes.length) throw Error('IMAGE_DECODE');
    if ([192,193,194].indexOf(marker) >= 0) dimensions = [((bytes[i+5]&255)<<8)|(bytes[i+6]&255), ((bytes[i+3]&255)<<8)|(bytes[i+4]&255)];
    i += size;
  }
  if (!dimensions || Math.min.apply(null, dimensions) < 1 || Math.max.apply(null, dimensions) > maxSide) throw Error('IMAGE_DECODE');
  return bytes;
}
function upload_(data) {
  if (!/^[a-f0-9-]{36}$/.test(String(data.id))) throw Error('DENIED');
  var originalBytes = bytes_(data.original, GALLERY.maxBytes), mime = detect_(originalBytes);
  var thumb = jpeg_(data.thumbnail, 480, 180000), preview = jpeg_(data.preview, 1600, 800000);
  var name = String(data.name || 'Fotografia').replace(/[\x00-\x1f/\\]/g, '_').slice(0,180);
  var folder = folder_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw Error('RATE_LIMIT');
  try {
    var existing = original_(data.id, folder);
    if (existing && existing.appProperties.state === 'ready') return { photo: photo_(existing) };
    var props = PropertiesService.getScriptProperties(), day = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
    var counter = JSON.parse(props.getProperty('GALLERY_DAILY') || '{}');
    if (counter.day !== day) counter = { day: day, count: 0 };
    if (counter.count >= GALLERY.maxDaily) throw Error('DRIVE_QUOTA');
    // Charge attempts, not just successes, to bound free-quota use on failed/repeated requests.
    counter.count++; props.setProperty('GALLERY_DAILY', JSON.stringify(counter));
    var quota = Drive.About.get({ fields: 'storageQuota' }).storageQuota;
    if (quota.limit && Number(quota.limit) - Number(quota.usage) < originalBytes.length + thumb.length + preview.length + 1048576) throw Error('DRIVE_QUOTA');
    // Retry removes only this incomplete app-created upload; no guest deletion API exists.
    if (existing) {
      var incomplete = Drive.Files.list({ q: query_(folder, "appProperties has { key='uploadId' and value='" + data.id + "' }"), fields: 'files(id)' }).files || [];
      incomplete.forEach(function(file) { Drive.Files.update({ trashed: true }, file.id); });
    }
    function save(role, bytes, type, filename) {
      return Drive.Files.create({ name: filename, parents: [folder], appProperties: { weddingGallery: 'v1', uploadId: data.id, role: role, state: 'pending' } }, Utilities.newBlob(bytes, type, filename), { fields: 'id,name,appProperties' });
    }
    var original = save('original', originalBytes, mime, name);
    var thumbnail = save('thumbnail', thumb, 'image/jpeg', data.id + '-thumb.jpg');
    var display = save('preview', preview, 'image/jpeg', data.id + '-preview.jpg');
    original = Drive.Files.update({ appProperties: { weddingGallery: 'v1', uploadId: data.id, role: 'original', state: 'ready', thumbnail: thumbnail.id, preview: display.id } }, original.id, null, { fields: 'id,name,appProperties' });
    return { photo: photo_(original) }; // Only after all three Drive writes succeed.
  } finally { lock.releaseLock(); }
}
function media_(id, variant) {
  if (variant !== 'thumbnail' && variant !== 'preview') throw Error('DENIED');
  var folder = folder_(), original = original_(id, folder);
  if (!original || original.appProperties.state !== 'ready') throw Error('NOT_FOUND');
  var fileId = original.appProperties[variant];
  var meta = Drive.Files.get(fileId, { fields: 'id,parents,mimeType,appProperties,trashed,size' });
  if (meta.trashed || meta.parents.indexOf(folder) < 0 || meta.mimeType !== 'image/jpeg' || meta.appProperties.uploadId !== id || meta.appProperties.role !== variant || Number(meta.size) > 800000) throw Error('DENIED');
  var cache = CacheService.getScriptCache(), key = id + ':' + variant, base64 = cache.get(key);
  if (!base64) {
    var response = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?alt=media', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) throw Error('STORAGE');
    base64 = Utilities.base64Encode(response.getContent());
    if (base64.length < 95000) cache.put(key, base64, 1800);
  }
  return { base64: base64, mime: 'image/jpeg' };
}
