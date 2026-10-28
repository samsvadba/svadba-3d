import './gallery-v3.css';
import { weddingMonogram } from './brand-v3.js';
import { createDriveBridge, preparePhoto, jpegObjectUrl } from './gallery-drive-v3.js';

const copy = {
  sk: {
    title: 'Naše svadobné momenty', subtitle: 'Podeľte sa s nami o svoje fotky zo svadby.',
    upload: 'Nahrať fotky', camera: 'Odfotiť', close: 'Zatvoriť galériu', closePhoto: 'Zatvoriť fotografiu',
    previous: 'Predchádzajúca fotografia', next: 'Nasledujúca fotografia',
    loading: 'Načítavame fotografie…', empty: 'Zatiaľ tu nie sú žiadne fotografie. Pridajte prvú spomienku.',
    setup: 'Galériu pripravujeme. Nahrávanie sprístupníme po prepojení úložiska.',
    unavailable: 'Galéria je momentálne nedostupná. Skúste to, prosím, znova.',
    refresh: 'Skúsiť znova', more: 'Načítať ďalšie fotografie',
    limits: 'JPEG, PNG, WebP a HEIC · najviac {size} MB na fotku · najviac {count} fotiek naraz',
    queueTitle: 'Vaše fotografie', waiting: 'Čaká na nahratie', sending: 'Nahráva sa', saving: 'Ukladá sa a pripravuje náhľad…',
    done: 'Fotografia je uložená', retry: 'Zopakovať nahratie', failed: 'Nahrávanie sa nepodarilo. Skúste to znova.',
    size: 'Fotografia je príliš veľká. Limit je {size} MB.', type: 'Tento formát nepodporujeme. Vyberte JPEG, PNG, WebP alebo HEIC.',
    batch: 'Naraz môžete vybrať najviac {count} fotografií.', busy: 'Počkajte, kým sa uvoľní miesto v rade na nahrávanie.',
    network: 'Spojenie sa prerušilo. Fotografiu môžete nahrať znova.',
    decode: 'Fotografiu sa nepodarilo spracovať. Skúste ju exportovať ako JPEG a nahrať znova.',
    rate: 'Teraz sa nahráva veľa fotografií. O chvíľu to skúste znova.',
    denied: 'Nahrávanie momentálne nie je povolené. Obráťte sa, prosím, na novomanželov.',
    storage: 'Úložisko je momentálne nedostupné. Skúste to neskôr.',
    quota: 'Bezplatný limit alebo miesto na Google Disku sa vyčerpalo. Skúste to zajtra alebo kontaktujte novomanželov.',
    photoError: 'Fotografiu sa nepodarilo načítať.', original: 'Otvoriť fotografiu v novej karte',
    uploadingElsewhere: 'Nahrávanie pokračuje aj po zatvorení galérie. Stránku zatiaľ nezatvárajte.',
    uploaded: 'Uložené fotografie: {count}.', photo: 'Svadobná fotografia', remove: 'Odstrániť z radu',
  },
  en: {
    title: 'Our wedding moments', subtitle: 'Share your photos from our wedding with us.',
    upload: 'Upload photos', camera: 'Take a photo', close: 'Close gallery', closePhoto: 'Close photo',
    previous: 'Previous photo', next: 'Next photo',
    loading: 'Loading photos…', empty: 'No photos yet. Share the first memory.',
    setup: 'Our gallery is being prepared. Uploads will be available once storage is connected.',
    unavailable: 'The gallery is currently unavailable. Please try again.',
    refresh: 'Try again', more: 'Load more photos',
    limits: 'JPEG, PNG, WebP and HEIC · up to {size} MB per photo · up to {count} photos at a time',
    queueTitle: 'Your photos', waiting: 'Waiting to upload', sending: 'Uploading', saving: 'Saving and preparing the preview…',
    done: 'Photo saved', retry: 'Retry upload', failed: 'The upload failed. Please try again.',
    size: 'This photo is too large. The limit is {size} MB.', type: 'Unsupported format. Choose JPEG, PNG, WebP or HEIC.',
    batch: 'You can select up to {count} photos at a time.', busy: 'Please wait for room in the upload queue.',
    network: 'The connection was interrupted. You can retry this photo.',
    decode: 'This photo could not be processed. Try exporting it as JPEG and upload it again.',
    rate: 'Many photos are being uploaded right now. Please try again shortly.',
    denied: 'Uploads are not available at the moment. Please contact the couple.',
    storage: 'Storage is temporarily unavailable. Please try again later.',
    quota: 'The free quota or Google Drive storage is full. Please try tomorrow or contact the couple.',
    photoError: 'This photo could not be loaded.', original: 'Open photo in a new tab',
    uploadingElsewhere: 'Uploads continue when the gallery is closed. Please keep this page open.',
    uploaded: 'Photos saved: {count}.', photo: 'Wedding photo', remove: 'Remove from queue',
  },
};

const icons = {
  upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13v6h16v-6M12 16V4m-4 4 4-4 4 4"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h5l2-3h4l2 3h5v13H3z"/><circle cx="12" cy="13" r="4"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19"/></svg>',
};

// Native dialog supplies modal focus containment and makes the surrounding app inert.
// This module owns no Journey, music or theme state; the existing application does.
export function createGallery({ config = {}, getLanguage = () => 'sk', onOpen = () => {}, onClose = () => {} } = {}) {
  const t = (key, vars = {}) => Object.entries(vars).reduce((value, [name, replacement]) =>
    value.replaceAll(`{${name}}`, String(replacement)), (copy[getLanguage()] || copy.sk)[key] || key);
  const api = createDriveBridge(config.scriptUrl);
  const limits = { maxFileBytes: 10 * 1024 * 1024, maxBatchFiles: 20 };
  const dialog = document.createElement('dialog');
  dialog.className = 'wedding-gallery';
  dialog.id = 'wedding-gallery';
  dialog.setAttribute('aria-labelledby', 'wedding-gallery-title');
  dialog.innerHTML = `
    <div class="gallery-shell">
      <header class="gallery-header"><div class="gallery-brand">${weddingMonogram()}</div><button type="button" class="gallery-close">${icons.close}</button></header>
      <div class="gallery-scroll">
        <section class="gallery-intro"><h2 id="wedding-gallery-title"></h2><p class="gallery-subtitle"></p>
          <div class="gallery-actions"><button type="button" class="gallery-upload">${icons.upload}<span></span></button><button type="button" class="gallery-camera">${icons.camera}<span></span></button></div>
          <p class="gallery-limits"></p>
        </section>
        <input class="gallery-files" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple hidden>
        <input class="gallery-capture" type="file" accept="image/*" capture="environment" hidden>
        <p class="gallery-feedback" role="alert" hidden></p>
        <section class="gallery-queue" aria-labelledby="gallery-queue-title" hidden><h3 id="gallery-queue-title"></h3><p class="gallery-queue-note"></p><ul class="gallery-queue-list"></ul></section>
        <p class="gallery-announcement gallery-sr-only" role="status" aria-live="polite"></p>
        <div class="gallery-status" role="status"><p></p><button type="button" class="gallery-refresh" hidden></button></div>
        <div class="gallery-grid"></div>
        <button type="button" class="gallery-more" hidden></button>
      </div>
    </div>
    <div class="gallery-lightbox" hidden><button type="button" class="gallery-photo-close">${icons.close}</button><button type="button" class="gallery-prev">←</button><figure><img class="gallery-large-photo" alt=""><figcaption></figcaption><p class="gallery-photo-error" hidden></p><a class="gallery-original" target="_blank" rel="noopener noreferrer" hidden></a></figure><button type="button" class="gallery-next">→</button></div>`;
  document.body.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  const shell = $('.gallery-shell'), grid = $('.gallery-grid'), status = $('.gallery-status');
  const uploadButton = $('.gallery-upload'), cameraButton = $('.gallery-camera');
  const fileInput = $('.gallery-files'), cameraInput = $('.gallery-capture');
  const feedback = $('.gallery-feedback'), queueElement = $('.gallery-queue-list');
  const lightbox = $('.gallery-lightbox'), largeImage = $('.gallery-large-photo');
  const queue = [], photos = [], photoNodes = new Map();
  let ready = false, loading = false, cursor = null, restoreFocus = null;
  let active = 0, selected = -1, lightboxReturn = null, loadRevision = 0;
  let statusKey = api ? 'loading' : 'setup', photoFailed = false;
  const mobileCamera = 'capture' in cameraInput && matchMedia('(pointer: coarse)').matches;
  cameraButton.hidden = !mobileCamera;
  const nav = document.getElementById('bottom-nav');
  const navHome = document.createComment('gallery navigation return point');
  let navInert = false, routed = false;
  const navResize = new ResizeObserver(() => {
    if (dialog.open && nav?.parentNode === dialog) dialog.style.setProperty('--gallery-nav-height', `${nav.getBoundingClientRect().height}px`);
  });
  if (nav) navResize.observe(nav);
  function dockNavigation() {
    if (!nav) return;
    navInert = nav.inert; nav.before(navHome); dialog.append(nav); nav.inert = false;
    dialog.style.setProperty('--gallery-nav-height', `${nav.getBoundingClientRect().height}px`);
  }
  function restoreNavigation() {
    if (!navHome.parentNode) return;
    navHome.replaceWith(nav); nav.inert = navInert; nav.hidden = false;
  }
  // Close synchronously in capture phase, before the original section handler runs.
  nav?.addEventListener('click', event => {
    if (!dialog.open || !event.target.closest('.nav-item')) return;
    routed = true; close();
  }, true);

  function text(selector, key, vars) { $(selector).textContent = t(key, vars); }
  function label(selector, key) { $(selector).setAttribute('aria-label', t(key)); $(selector).title = t(key); }
  function setStatus(key, retry = false) {
    statusKey = key;
    status.hidden = !key;
    text('.gallery-status p', key || 'empty');
    $('.gallery-refresh').hidden = !retry;
  }
  function updateControls() {
    uploadButton.disabled = cameraButton.disabled = !ready;
    $('.gallery-more').hidden = !cursor;
    $('.gallery-more').disabled = loading;
    text('.gallery-limits', 'limits', { size: Math.floor(limits.maxFileBytes / 1024 / 1024), count: limits.maxBatchFiles });
  }
  function refreshLanguage() {
    dialog.lang = getLanguage() === 'en' ? 'en' : 'sk';
    text('#wedding-gallery-title', 'title'); text('.gallery-subtitle', 'subtitle');
    text('.gallery-upload span', 'upload'); text('.gallery-camera span', 'camera');
    text('#gallery-queue-title', 'queueTitle'); text('.gallery-queue-note', 'uploadingElsewhere');
    text('.gallery-refresh', 'refresh'); text('.gallery-more', 'more');
    label('.gallery-close', 'close'); label('.gallery-photo-close', 'closePhoto');
    label('.gallery-prev', 'previous'); label('.gallery-next', 'next');
    text('.gallery-photo-error', 'photoError'); text('.gallery-original', 'original');
    if (statusKey) text('.gallery-status p', statusKey);
    if (feedback.dataset.key) feedback.textContent = t(feedback.dataset.key, JSON.parse(feedback.dataset.vars || '{}'));
    for (const item of queue) renderQueueItem(item);
    for (const photo of photos) photoNodes.get(photo.id)?.setAttribute('aria-label', `${t('photo')}: ${photo.name}`);
    updateControls();
  }
  function showFeedback(key, vars = {}) {
    feedback.dataset.key = key; feedback.dataset.vars = JSON.stringify(vars);
    feedback.textContent = t(key, vars); feedback.hidden = false;
  }
  async function load(reset = false) {
    if (!api || loading) return;
    const revision = ++loadRevision;
    loading = true;
    if (!photos.length) setStatus('loading');
    updateControls();
    try {
      if (!ready) {
        const state = await api.call('status');
        if (!state.ready) throw new Error('unavailable');
        limits.maxFileBytes = Math.min(10 * 1024 * 1024, Number(state.maxFileBytes) || limits.maxFileBytes);
        limits.maxBatchFiles = Math.min(20, Number(state.maxBatchFiles) || limits.maxBatchFiles);
        ready = true;
      }
      const page = await api.call('list', { cursor: !reset ? cursor : null });
      if (revision !== loadRevision) return;
      if (!Array.isArray(page.photos)) throw new Error('unavailable');
      for (const candidate of page.photos) addPhoto(candidate);
      cursor = typeof page.nextCursor === 'string' && page.nextCursor.length < 2048 ? page.nextCursor : null;
      setStatus(photos.length ? null : 'empty');
    } catch (error) {
      if (error.name !== 'AbortError' && revision === loadRevision) {
        ready = false;
        setStatus(uploadErrorKey(error) === 'quota' ? 'quota' : 'unavailable', true);
      }
    } finally {
      if (revision === loadRevision) { loading = false; updateControls(); }
    }
  }
  function normalizePhoto(candidate) {
    if (!candidate || typeof candidate.id !== 'string' || !candidate.id || candidate.id.length > 128) return null;
    if (!/^[a-f0-9-]{36}$/.test(candidate.id)) return null;
    return { id: candidate.id, name: String(candidate.name || t('photo')).slice(0, 300) };
  }
  const mediaCache = new Map();
  let mediaTail = Promise.resolve();
  function media(photo, variant) {
    const key = `${photo.id}:${variant}`;
    if (!mediaCache.has(key)) {
      // Serial RPCs stay well below Apps Script's execution/concurrency quotas.
      const result = (variant === 'preview' ? Promise.resolve() : mediaTail.catch(() => {})).then(() => api.call('media', { id: photo.id, variant })).then(jpegObjectUrl);
      mediaCache.set(key, result); if (variant === 'thumbnail') mediaTail = result;
      result.catch(() => mediaCache.delete(key));
    }
    return mediaCache.get(key);
  }
  const thumbnails = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      thumbnails.unobserve(entry.target);
      const photo = photos.find(value => value.id === entry.target.dataset.id);
      media(photo, 'thumbnail').then(url => { entry.target.querySelector('img').src = url; }).catch(() => { entry.target.classList.add('gallery-tile-failed'); entry.target.textContent = t('photoError'); });
    }
  }, { root: $('.gallery-scroll'), rootMargin: '180px' });
  function addPhoto(candidate, prepend = false) {
    const photo = normalizePhoto(candidate);
    if (!photo || photoNodes.has(photo.id)) return !!photo;
    prepend ? photos.unshift(photo) : photos.push(photo);
    if (!lightbox.hidden) {
      if (prepend) selected++;
      $('.gallery-lightbox figcaption').textContent = `${selected + 1} / ${photos.length}`;
      $('.gallery-next').disabled = selected === photos.length - 1;
    }
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'gallery-tile';
    button.setAttribute('aria-label', `${t('photo')}: ${photo.name}`);
    const image = document.createElement('img');
    image.alt = ''; image.loading = 'lazy'; image.decoding = 'async'; button.dataset.id = photo.id;
    image.onerror = () => { button.classList.add('gallery-tile-failed'); button.textContent = t('photoError'); };
    button.append(image); button.onclick = () => openPhoto(photos.findIndex(value => value.id === photo.id), button);
    photoNodes.set(photo.id, button);
    prepend ? grid.prepend(button) : grid.append(button);
    thumbnails.observe(button);
    return true;
  }
  function openPhoto(index, origin = null) {
    if (!photos[index]) return;
    selected = index; lightboxReturn = origin || lightboxReturn;
    lightbox.hidden = false; shell.inert = true;
    if (nav) { nav.hidden = true; nav.inert = true; }
    const photo = photos[index];
    photoFailed = false;
    $('.gallery-photo-error').hidden = true; $('.gallery-original').hidden = true;
    largeImage.hidden = false; largeImage.alt = photo.name;
    largeImage.removeAttribute('src');
    media(photo, 'preview').then(url => {
      if (selected !== index || lightbox.hidden) return;
      largeImage.src = url; $('.gallery-original').href = url;
    }).catch(() => { if (selected === index && !lightbox.hidden) largeImage.onerror(); });
    $('.gallery-lightbox figcaption').textContent = `${index + 1} / ${photos.length}`;
    $('.gallery-prev').disabled = index === 0;
    $('.gallery-next').disabled = index === photos.length - 1;
    if (origin) $('.gallery-photo-close').focus();
  }
  largeImage.onerror = () => {
    photoFailed = true; largeImage.hidden = true;
    $('.gallery-photo-error').hidden = false;
  };
  largeImage.onload = () => { if (!photoFailed) largeImage.hidden = false; };
  function closePhoto(restore = true) {
    lightbox.hidden = true; shell.inert = false; selected = -1; largeImage.removeAttribute('src');
    if (nav) { nav.hidden = false; nav.inert = false; }
    if (restore && lightboxReturn?.isConnected) lightboxReturn.focus();
  }
  function renderQueueItem(item) {
    if (!item.element) {
      item.element = document.createElement('li');
      item.element.className = 'gallery-queue-item';
      const name = document.createElement('span'); name.className = 'gallery-file-name'; name.textContent = item.file.name;
      const state = document.createElement('span'); state.className = 'gallery-file-state';
      const progress = document.createElement('progress'); progress.max = 100; progress.value = 0;
      const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'gallery-file-retry';
      retry.onclick = () => { item.state = 'waiting'; item.progress = 0; item.error = null; renderQueueItem(item); pump(); };
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'gallery-file-remove'; remove.textContent = '×';
      remove.onclick = () => {
        const index = queue.indexOf(item);
        if (index < 0 || item.state === 'sending' || item.state === 'saving') return;
        queue.splice(index, 1); item.element.remove(); $('.gallery-queue').hidden = !queue.length;
      };
      item.element.append(name, state, progress, retry, remove); queueElement.append(item.element);
    }
    item.element.dataset.state = item.state;
    item.element.querySelector('.gallery-file-state').textContent = t(item.error || item.state, { size: Math.floor(limits.maxFileBytes / 1024 / 1024) });
    const progress = item.element.querySelector('progress');
    if (item.state === 'sending' || item.state === 'saving') progress.removeAttribute('value'); else progress.value = item.progress;
    progress.setAttribute('aria-label', `${item.file.name}: ${t(item.state)}`);
    const retry = item.element.querySelector('.gallery-file-retry'); retry.hidden = item.state !== 'failed'; retry.textContent = t('retry');
    const remove = item.element.querySelector('.gallery-file-remove');
    remove.hidden = item.state === 'sending' || item.state === 'saving'; remove.setAttribute('aria-label', `${t('remove')}: ${item.file.name}`);
  }
  function acceptFiles(files) {
    if (!ready) return;
    feedback.hidden = true; delete feedback.dataset.key;
    if (files.length > limits.maxBatchFiles) { showFeedback('batch', { count: limits.maxBatchFiles }); return; }
    // Bound retained File objects, including failed uploads, instead of retaining an unlimited queue.
    for (let index = queue.length - 1; index >= 0 && queue.length + files.length > 40; index--) {
      if (queue[index].state === 'done') { queue[index].element.remove(); queue.splice(index, 1); }
    }
    if (queue.length + files.length > 40) { showFeedback('busy'); return; }
    for (const file of files) {
      if (!isAcceptedPhoto(file)) { showFeedback('type'); continue; }
      if (!file.size || file.size > limits.maxFileBytes) { showFeedback('size', { size: Math.floor(limits.maxFileBytes / 1024 / 1024) }); continue; }
      const item = { file, id: crypto.randomUUID(), state: 'waiting', progress: 0, error: null };
      queue.push(item); renderQueueItem(item);
    }
    $('.gallery-queue').hidden = !queue.length;
    pump();
  }
  async function upload(item) {
    const data = await preparePhoto(item.file);
    item.state = 'saving'; renderQueueItem(item);
    const result = await api.call('upload', { id: item.id, ...data });
    if (!normalizePhoto(result?.photo)) throw {code:'STORAGE'};
    return result.photo;
  }
  function pump() {
    // One conversion/upload at a time keeps mobile memory and free quotas bounded.
    while (active < 1) {
      const item = queue.find(value => value.state === 'waiting');
      if (!item) break;
      active++; item.state = 'sending'; renderQueueItem(item);
      upload(item).then(photo => {
        addPhoto(photo, true); item.state = 'done'; item.progress = 100;
        setStatus(null);
        text('.gallery-announcement', 'uploaded', { count: queue.filter(value => value.state === 'done').length });
      }).catch(error => {
        item.state = 'failed'; item.error = uploadErrorKey(error);
        $('.gallery-announcement').textContent = `${item.file.name}: ${t(item.error, { size: Math.floor(limits.maxFileBytes / 1024 / 1024) })}`;
      })
        .finally(() => { active--; renderQueueItem(item); pump(); });
    }
  }
  uploadButton.onclick = () => fileInput.click(); cameraButton.onclick = () => cameraInput.click();
  fileInput.onchange = () => { acceptFiles([...fileInput.files]); fileInput.value = ''; };
  cameraInput.onchange = () => { acceptFiles([...cameraInput.files]); cameraInput.value = ''; };
  $('.gallery-refresh').onclick = () => load(true); $('.gallery-more').onclick = () => load();
  $('.gallery-prev').onclick = () => openPhoto(selected - 1); $('.gallery-next').onclick = () => openPhoto(selected + 1);
  $('.gallery-photo-close').onclick = () => closePhoto(); $('.gallery-close').onclick = () => close();
  dialog.addEventListener('cancel', event => { if (!lightbox.hidden) { event.preventDefault(); closePhoto(); } });
  dialog.addEventListener('keydown', event => {
    // Intro/Journey also listen on document. Modal controls own keyboard input.
    event.stopPropagation();
    if (lightbox.hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft' && selected > 0) { event.preventDefault(); openPhoto(selected - 1); }
    if (event.key === 'ArrowRight' && selected < photos.length - 1) { event.preventDefault(); openPhoto(selected + 1); }
  });
  dialog.addEventListener('close', () => {
    closePhoto(false); restoreNavigation(); ++loadRevision; loading = false;
    onClose();
    if (!routed && restoreFocus?.isConnected) restoreFocus.focus({ preventScroll: true });
  });
  function open(trigger) {
    if (dialog.open) return;
    restoreFocus = trigger || document.activeElement; routed = false;
    refreshLanguage(); onOpen(); dialog.showModal(); dockNavigation(); $('.gallery-close').focus({ preventScroll: true });
    if (api) load(true); else setStatus('setup');
  }
  function close() { if (dialog.open) { restoreNavigation(); dialog.close(); } }
  refreshLanguage();
  return { open, close, refreshLanguage, isOpen: () => dialog.open };
}

export function uploadMime(file) {
  const extension = String(file.name).split('.').pop().toLowerCase();
  return file.type || ({ heic: 'image/heic', heif: 'image/heif', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[extension] || 'application/octet-stream');
}
export function isAcceptedPhoto(file) {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'].includes(uploadMime(file).toLowerCase());
}
export function uploadErrorKey(error) {
  const code = String(error?.code || '').toUpperCase();
  if (error?.status === 429 || /RATE|BUSY|CONCURRENT/.test(code)) return 'rate';
  if (error?.status === 413 || code === 'FILE_TOO_LARGE') return 'size';
  if (error?.status === 415 || /UNSUPPORTED_TYPE|TYPE_MISMATCH/.test(code)) return 'type';
  if (error?.status === 422 || /IMAGE_DIMENSIONS|ANIMATED_IMAGE|IMAGE_DECODE/.test(code)) return 'decode';
  if (error?.status === 401 || error?.status === 403 || /DENIED|UNAUTHORIZED|FORBIDDEN/.test(code)) return 'denied';
  if (/NETWORK|TIMEOUT/.test(code) || error?.status === 0) return 'network';
  if (/QUOTA/.test(code)) return 'quota';
  if (/DRIVE|STORAGE/.test(code)) return 'storage';
  return 'failed';
}
