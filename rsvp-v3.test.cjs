// Focused DOM contract tests. The fake form records JSON in memory; no network exists.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const rootPath = __dirname;
const source = fs.readFileSync(path.join(rootPath, 'rsvp-v3.js'), 'utf8').replace('export function', 'function');
const configSource = fs.readFileSync(path.join(rootPath, 'config-v3.js'), 'utf8').replace('export default config;', 'globalThis.weddingConfig = config;');
const configContext = vm.createContext({});
vm.runInContext(configSource, configContext);
const translations = configContext.weddingConfig.ui;

function fixture(reducedMotion = false) {
  const events = new Map(), timers = new Map(), submissions = [], animations = [];
  let timerId = 0, lang = 'sk', active = null;
  const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  class Element {
    constructor(tag = 'div', attrs = {}) {
      this.tagName = tag; this.attrs = attrs; this.listeners = new Map(); this.children = [];
      this.dataset = Object.fromEntries(Object.entries(attrs).filter(([k]) => k.startsWith('data-')).map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]));
      for (const k of ['type', 'name', 'id', 'value']) this[k] = attrs[k] || '';
      this.disabled = 'disabled' in attrs; this.hidden = 'hidden' in attrs;
      if (tag === 'iframe') this.contentWindow = {};
    }
    set innerHTML(html) {
      this.html = html; this.nodes = [];
      const stack = [this];
      for (const m of html.matchAll(/<(\/?)(\w+)([^>]*?)>/g)) {
        if (m[1]) { if (stack.length > 1) stack.pop(); continue; }
        const attrs = {};
        for (const a of (m[3] || '').matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attrs[a[1]] = decode(a[2] || '');
        const node = new Element(m[2], attrs); node.nodes = [];
        if (m[2] === 'textarea') node.value = decode(html.slice(m.index + m[0].length).split('</textarea>')[0]);
        stack[stack.length - 1].nodes.push(node);
        if (!['input', 'br', 'hr', 'img'].includes(m[2]) && !m[0].endsWith('/>')) stack.push(node);
      }
    }
    get innerHTML() { return this.html; }
    matches(selector) {
      selector = selector.trim();
      const tag = selector.match(/^\w+/)?.[0];
      if (tag && this.tagName !== tag) return false;
      const cls = selector.match(/\.([\w-]+)/)?.[1];
      if (cls && !(this.attrs.class || '').split(' ').includes(cls)) return false;
      for (const m of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)) {
        if (!(m[1] in this.attrs)) return false;
        if (m[2] !== undefined && this.attrs[m[1]] !== m[2]) return false;
      }
      return true;
    }
    querySelectorAll(selector) { return (this.nodes || []).flatMap(n => [...(selector.split(',').some(s => n.matches(s)) ? [n] : []), ...n.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    removeAttribute(k) { delete this.attrs[k]; }
    addEventListener(k, fn) { if (!this.listeners.has(k)) this.listeners.set(k, []); this.listeners.get(k).push(fn); }
    fire(k, props = {}) { for (const fn of [...(this.listeners.get(k) || [])]) fn({ currentTarget: this, preventDefault() {}, ...props }); }
    focus() { active = this; }
    append(...children) { this.children.push(...children); }
    remove() { this.removed = true; }
    submit() { submissions.push({ form: this, payload: JSON.parse(this.children[0].value) }); }
  }
  const root = new Element(), body = new Element('body');
  const window = {
    addEventListener(k, fn) { if (!events.has(k)) events.set(k, new Set()); events.get(k).add(fn); },
    removeEventListener(k, fn) { events.get(k)?.delete(fn); }
  };
  const context = vm.createContext({ crypto: require('node:crypto').webcrypto, document: { createElement: tag => new Element(tag), body }, window, setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); } });
  vm.runInContext(source, context);
  const api = context.createRSVP(root, { t: key => translations[lang][key], endpoint: 'https://example.invalid/never-requested', reducedMotion, gsap: { fromTo(...args) { animations.push(args); } } });
  const node = selector => { const el = root.querySelector(selector); assert.ok(el, `Missing ${selector}`); return el; };
  const submit = () => node('form').fire('submit');
  const input = (selector, value, event = 'input') => { const el = node(selector); el.value = String(value); el.fire(event); };
  const choose = (name, value) => input(`input[name="${name}"][value="${value}"]`, value, 'change');
  const count = (name, value) => input(`[name="${name}"]`, value, 'change');
  const back = () => node('[data-back]').fire('click');
  const frame = () => body.children.findLast(el => el.tagName === 'iframe' && !el.removed);
  const message = (ok, source = frame()?.contentWindow, type = 'sm-wedding-rsvp', requestId = submissions.at(-1)?.payload.requestId, origin = 'https://script.googleusercontent.com') => { for (const fn of [...(events.get('message') || [])]) fn({ source, origin, data: { type, ok, requestId } }); };
  const tick = () => { for (const fn of [...timers.values()]) fn(); };
  const language = value => { lang = value; api.refreshLanguage(); };
  return { root, node, submit, input, choose, count, back, frame, message, tick, language, submissions, animations, events, timers, body, get active() { return active; } };
}

function startGuests(f, attending = 'yes', count = 1) {
  f.choose('attending', attending); f.submit(); f.count('guestCount', count);
  for (let i = 0; i < count; i++) f.input(`[data-name-index="${i}"]`, ` Guest ${i + 1} `);
}
function yesReview(f, count = 1, lodging = 'yes') {
  startGuests(f, 'yes', count); f.submit(); f.choose('transport', 'bus'); f.submit();
  f.choose('lodging', lodging); if (lodging === 'yes') f.count('lodgingCount', count);
  f.submit(); f.input('[name="dietary"]', 'Gluten free'); f.input('[name="music"]', 'Our song'); f.input('[name="message"]', 'See you soon'); f.submit();
}

// Required fields: correct focus, accessible errors, no submission before review.
{
  const f = fixture({ matches: false });
  f.submit(); assert.equal(f.active.name, 'attending'); assert.equal(f.active.attrs['aria-invalid'], 'true');
  assert.equal(f.active.attrs['aria-describedby'], 'w-rsvp-error');
  f.language('en'); assert.equal(f.node('[name="attending"]').attrs['aria-invalid'], 'true');
  f.choose('attending', 'yes'); f.submit();
  f.count('guestCount', 99); assert.equal(f.node('[name="guestCount"]').value, '12');
  f.count('guestCount', -3); assert.equal(f.node('[name="guestCount"]').value, '1');
  f.input('[data-name-index="0"]', '   '); f.submit();
  assert.equal(f.active.dataset.nameIndex, '0'); assert.equal(f.active.attrs['aria-invalid'], 'true');
  f.input('[data-name-index="0"]', 'Name'); assert.equal(f.node('[data-name-index="0"]').attrs['aria-invalid'], undefined);
  f.submit(); f.submit(); assert.equal(f.active.name, 'transport');
  f.choose('transport', 'direct'); f.submit(); f.submit(); assert.equal(f.active.name, 'lodging');
  assert.equal(f.submissions.length, 0); assert.ok(f.animations.length > 0, 'MediaQueryList false must animate');
}
// Every supported group size validates names, obeys lodging max, sends exact contract once.
{
  const f = fixture(); f.choose('attending', 'yes'); f.submit();
  const field = f.node('[name="guestCount"]'), next = f.node('button[type="submit"]');
  field.focus(); f.input('[name="guestCount"]', 12);
  assert.equal(f.root.querySelectorAll('[data-name-index]').length, 12, 'Input event immediately updates guest fields');
  assert.equal(f.active, field); assert.equal(f.node('[name="guestCount"]'), field, 'Focused number stays in DOM');
  assert.equal(f.node('button[type="submit"]'), next, 'Next button stays in DOM');
  assert.equal(f.node('[data-count="guestCount"][data-delta="1"]').disabled, true);
  f.input('[data-name-index="11"]', 'Twelfth guest');
  f.input('[name="guestCount"]', 99);
  assert.equal(field.value, '99'); field.fire('change'); assert.equal(field.value, '12');
  assert.equal(f.node('[data-name-index="11"]').value, 'Twelfth guest', 'New names fields are bound');
  assert.equal(f.node('button[type="submit"]'), next, 'Blur/change does not replace pending click target');
  f.input('[name="guestCount"]', ''); assert.equal(f.root.querySelectorAll('[data-name-index]').length, 12, 'Clearing number to type does not immediately discard names');
  f.input('[name="guestCount"]', 1); assert.equal(f.root.querySelectorAll('[data-name-index]').length, 1);
  assert.equal(f.node('[data-count="guestCount"][data-delta="-1"]').disabled, true);
}
for (let count = 1; count <= 12; count++) {
  const f = fixture(); startGuests(f, 'yes', count);
  f.input(`[data-name-index="${count - 1}"]`, ''); f.submit();
  assert.equal(f.active.dataset.nameIndex, String(count - 1));
  f.input(`[data-name-index="${count - 1}"]`, ` Guest ${count} `); f.submit();
  f.choose('transport', 'bus'); f.submit(); f.choose('lodging', 'yes'); f.count('lodgingCount', 99);
  assert.equal(f.node('[name="lodgingCount"]').value, String(count)); f.submit(); f.submit();
  assert.equal(f.submissions.length, 0, 'Review must precede send');
  f.submit(); f.submit(); assert.equal(f.submissions.length, 1, 'Duplicate send prevented');
  const payload = f.submissions[0].payload;
  assert.deepEqual(Object.keys(payload), ['requestId', 'guestNames', 'attendance', 'transport', 'lodging', 'lodgingCount', 'dietary', 'music', 'message', 'website']);
  assert.equal(payload.guestNames.length, count); assert.equal(payload.guestNames[0], 'Guest 1'); assert.equal(payload.lodgingCount, count);
  f.message(true, {}); assert.ok(f.frame(), 'Wrong source ignored');
  f.message(true, f.frame().contentWindow, 'wrong'); assert.ok(f.frame(), 'Wrong type ignored');
  f.frame().fire('load'); assert.ok(f.frame(), 'Iframe load alone cannot confirm');
  f.language('en'); f.submit(); assert.equal(f.submissions.length, 1, 'Language change preserves sending lock');
  f.message(true, f.frame().contentWindow, 'sm-wedding-rsvp', 'stale'); assert.ok(f.frame());
  f.message(true, f.frame().contentWindow, 'sm-wedding-rsvp', payload.requestId, 'https://evil.example'); assert.ok(f.frame());
  f.message('true'); assert.ok(f.frame());
  f.message(true, { parent: { parent: f.frame().contentWindow } }); assert.ok(f.root.innerHTML.includes('Your reply has been saved')); assert.equal(f.frame(), undefined);
  assert.equal(f.events.get('message').size, 0); assert.equal(f.timers.size, 0);
}
// Editing and changing attendance never leaks stale attending-only fields into decline.
{
  const f = fixture(); yesReview(f, 3);
  f.back(); assert.equal(f.active.name, 'dietary', 'Edit focuses current step input');
  f.language('en'); assert.equal(f.node('[name="dietary"]').value, 'Gluten free');
  f.back(); f.back(); f.back(); f.back(); f.choose('attending', 'no'); f.submit();
  assert.equal(f.node('[data-name-index="2"]').value, ' Guest 3 '); f.submit(); f.submit();
  assert.deepEqual(f.submissions[0].payload, { requestId: f.submissions[0].payload.requestId, guestNames: ['Guest 1', 'Guest 2', 'Guest 3'], attendance: 'no', transport: '', lodging: '', lodgingCount: 1, dietary: '', music: '', message: '', website: '' });
  f.message(false); assert.ok(f.root.innerHTML.includes('could not be saved')); assert.equal(f.events.get('message').size, 0);
  f.submit(); assert.equal(f.submissions.length, 2, 'Explicit retry allowed after server error');
  f.tick(); assert.ok(f.root.innerHTML.includes('have not received a save confirmation')); assert.equal(f.events.get('message').size, 0);
  assert.equal(f.submissions.length, 2, 'No automatic retry after timeout');
  f.language('sk'); assert.ok(f.root.innerHTML.includes('Guest 3')); assert.ok(f.root.innerHTML.includes('Potvrdenie uloženia'));
}
for (const reduced of [true, { matches: true }]) {
  const f = fixture(reduced); f.choose('attending', 'yes'); f.submit(); assert.equal(f.animations.length, 0);
}
// Current bus choices retain the existing receiver contract and optional message.
for (const transport of ['bus', 'direct']) {
  const f = fixture(); startGuests(f); f.submit();
  assert.ok(f.root.innerHTML.includes(translations.sk.rsvpBus));
  assert.ok(f.root.innerHTML.includes(translations.sk.rsvpDirect));
  f.choose('transport', transport); f.language('en');
  assert.ok(f.root.innerHTML.includes(translations.en.rsvpTransportQuestion));
  f.submit(); f.choose('lodging', 'no'); f.submit();
  assert.equal(f.node('[name="message"]').attrs.required, undefined);
  f.input('[name="message"]', 'Tešíme sa na vás!'); f.submit(); f.submit();
  assert.equal(f.submissions[0].payload.transport, transport);
  assert.equal(f.submissions[0].payload.message, 'Tešíme sa na vás!');
  f.message(true); assert.equal(f.frame(), undefined);
}
const config = configContext.weddingConfig;
assert.equal(config.wedding.ceremony.time, '15:00');
assert.equal(config.wedding.dateLabel, '30 · 04 · 2027');
assert.equal(config.wedding.faq.filter(item => item.questionKey === 'wFaqRsvpQ').length, 1, 'RSVP guidance must be rendered once');
assert.ok(!config.wedding.faq.some(item => item.questionKey === 'wFaqMessageQ'), 'Personal messages are covered by the contact answer');
assert.deepEqual(Array.from(config.wedding.timeline, item => item.time || item.timeKey), ['14:50', '15:00', 'wAfterCeremony', 'wAfterCeremony']);
for (const lang of ['sk', 'en']) {
  assert.ok(!/14:00|14:15/.test(JSON.stringify(config.ui[lang])));
  assert.ok(!/doplníme|will be announced|coming soon|soon\./i.test(['wFaqPlusOneA', 'wFaqContactA', 'wFaqRsvpA'].map(key=>config.ui[lang][key]).join(' ')), 'Final FAQ answers must not contain placeholders');
  const faqKeys = Array.from(config.wedding.faq, item => item.questionKey);
  assert.equal(new Set(faqKeys).size, faqKeys.length, 'No duplicate FAQ entries');
  for (const item of config.wedding.faq) {
    assert.ok(config.ui[lang][item.questionKey], item.questionKey);
    assert.ok(config.ui[lang][item.answerKey], item.answerKey);
    for (const link of item.links || []) {
      assert.equal(new URL(link.url).protocol, 'https:');
      assert.ok(config.ui[lang][link.labelKey], link.labelKey);
    }
    if (item.tab) assert.equal(item.tab, 'rsvp');
  }
}
assert.equal(config.gallery.url, null, 'No non-functional gallery upload link');
console.log('PASS: RSVP 1–12 guests, required-field focus/aria, lodging bounds, review, yes/no payloads, duplicate guard, message validation, success/error/timeout cleanup, language preservation, boolean/MediaQueryList reduced motion. No network requests.');
