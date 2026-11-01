// Focused DOM-surface checks; native button activation remains browser-owned.
import assert from 'node:assert/strict';
import './public/theme-v3.js';
import { createThemePicker } from './theme-picker-v3.js';

const previous = new Map(['document', 'MutationObserver', 'setTimeout', 'clearTimeout'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
let documentStub;
class Element {
  constructor(tag) {
    this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = new Map(); this.events = new Map(); this.hidden = false;
    this.classes = new Set(); this.classList = {add: c => this.classes.add(c), remove: c => this.classes.delete(c)};
    this.variables = new Map(); this.style = {setProperty: (k, v) => this.variables.set(k, v)};
  }
  append(child) {child.parent = this; this.children.push(child);}
  setAttribute(k, v) {this.attributes.set(k, String(v));}
  getAttribute(k) {return this.attributes.get(k);}
  addEventListener(type, fn) {if (!this.events.has(type)) this.events.set(type, []); this.events.get(type).push(fn);}
  contains(target) {return target === this || this.children.some(child => child.contains(target));}
  focus() {documentStub.activeElement = this;}
  getBoundingClientRect() {return {top: 800, bottom: 840, height: 40};}
  emit(type, details = {}) {
    const event = {target: this, prevented: false, stopped: false, preventDefault() {this.prevented = true;}, stopPropagation() {this.stopped = true;}, ...details};
    for (const listener of this.events.get(type) || []) listener(event);
    return event;
  }
}
try {
  documentStub = new Element('document'); documentStub.createElement = tag => new Element(tag);
  documentStub.getElementById = id => id === 'bottom-nav' ? {getBoundingClientRect: () => ({top: 700, bottom: 780, height: 80})} : null;
  globalThis.document = documentStub;
  const observers = [];
  globalThis.MutationObserver = class {constructor(callback) {this.callback = callback; observers.push(this);} observe(target, options) {this.target = target; this.options = options;}};
  const timers = new Map(); let timerId = 0;
  globalThis.setTimeout = (fn, ms) => {const id = ++timerId; timers.set(id, {fn, ms}); return id;};
  globalThis.clearTimeout = id => timers.delete(id);
  const trigger = new Element('button'), container = new Element('div'); container.append(trigger);
  let selected = 'purple', language = 'sk', choices = 0;
  const reducedMotion = {matches: true};
  const picker = createThemePicker({trigger, container, palettes: SMWeddingTheme.palettes, getSelection: () => selected,
    onSelect: id => {selected = id; choices++;}, getLanguage: () => language, getLabel: () => language === 'sk' ? 'Farebná paleta' : 'Color palette', reducedMotion});
  const panel = container.children.find(child => child.id === 'theme-picker'), buttons = panel.children;
  assert.ok(panel); assert.equal(panel.getAttribute('role'), 'dialog'); assert.equal(panel.getAttribute('aria-modal'), 'false');
  assert.equal(trigger.getAttribute('aria-controls'), 'theme-picker'); assert.equal(trigger.getAttribute('aria-haspopup'), 'dialog');
  assert.equal(trigger.getAttribute('aria-expanded'), 'false'); assert.equal(panel.hidden, true);
  assert.deepEqual(buttons.map(b => b.dataset.palette), SMWeddingTheme.palettes.map(p => p.id));
  for (const [i, button] of buttons.entries()) {
    assert.equal(button.tagName, 'button'); assert.equal(button.type, 'button');
    assert.equal(button.getAttribute('aria-label'), SMWeddingTheme.palettes[i].sk);
    assert.equal(button.getAttribute('aria-pressed'), String(button.dataset.palette === selected));
    assert.equal(button.children[0].getAttribute('aria-hidden'), 'true');
  }
  trigger.emit('click');
  assert.equal(panel.hidden, false); assert.equal(trigger.getAttribute('aria-expanded'), 'true'); assert.equal(documentStub.activeElement, buttons[9]);
  assert.equal(panel.variables.get('bottom'), '152px', 'Picker must sit above the existing navigation');
  let event = panel.emit('keydown', {key: 'ArrowRight'});
  assert.equal(documentStub.activeElement, buttons[0]); assert.ok(event.prevented && event.stopped);
  panel.emit('keydown', {key: 'ArrowLeft'}); assert.equal(documentStub.activeElement, buttons[9]);
  panel.emit('keydown', {key: 'ArrowDown'}); assert.equal(documentStub.activeElement, buttons[4]);
  panel.emit('keydown', {key: 'ArrowUp'}); assert.equal(documentStub.activeElement, buttons[9]);
  panel.emit('keydown', {key: 'Home'}); assert.equal(documentStub.activeElement, buttons[0]);
  panel.emit('keydown', {key: 'End'}); assert.equal(documentStub.activeElement, buttons[9]);
  assert.equal(choices, 0, 'Arrow keys must not select or modify the running theme');
  buttons[7].emit('click');
  assert.equal(selected, 'blue'); assert.equal(choices, 1); assert.equal(panel.hidden, true); assert.equal(documentStub.activeElement, trigger);
  assert.equal(trigger.getAttribute('aria-expanded'), 'false');
  trigger.emit('click'); assert.equal(documentStub.activeElement, buttons[7]);
  assert.equal(buttons[7].getAttribute('aria-pressed'), 'true'); assert.equal(buttons[9].getAttribute('aria-pressed'), 'false');
  event = documentStub.emit('keydown', {key: 'Escape'});
  assert.ok(event.prevented && event.stopped); assert.equal(panel.hidden, true); assert.equal(documentStub.activeElement, trigger);
  trigger.emit('click'); documentStub.emit('pointerdown', {target: buttons[0]}); assert.equal(panel.hidden, false, 'Inside pointerdown must keep picker open');
  documentStub.emit('pointerdown', {target: trigger}); assert.equal(panel.hidden, false, 'Trigger pointerdown must not pre-close before click');
  documentStub.emit('pointerdown', {target: new Element('div')}); assert.equal(panel.hidden, true);
  trigger.emit('click'); trigger.emit('click'); assert.equal(panel.hidden, true, 'Repeated trigger closes');
  trigger.emit('click'); event = panel.emit('keydown', {key: 'Tab'}); assert.equal(panel.hidden, true); assert.equal(event.prevented, false, 'Tab must preserve native focus traversal');
  language = 'en'; picker.refresh();
  assert.equal(trigger.getAttribute('aria-label'), 'Color palette'); assert.equal(buttons[7].getAttribute('aria-label'), 'Blue');
  assert.equal(selected, 'blue');
  trigger.emit('click'); container.inert = true; observers[0].callback();
  assert.equal(panel.hidden, true, 'Fullscreen media cannot leave an open inert picker'); container.inert = false;
  reducedMotion.matches = false;
  trigger.emit('click'); trigger.emit('click');
  assert.equal(panel.hidden, false); assert.equal(timers.size, 1); assert.equal([...timers.values()][0].ms, 180);
  trigger.emit('click'); assert.equal(timers.size, 0, 'Reopening cancels the fade hide timer'); assert.equal(panel.hidden, false);
  picker.close(); const pending = [...timers.values()][0]; pending.fn(); assert.equal(panel.hidden, true);
  assert.equal(choices, 1, 'Closing or language changes never modify the theme');
  console.log('Theme picker V3 passed: ordered accessible swatches, keyboard navigation, selection/focus return, Escape/outside/Tab/toggle close, translation, inert cleanup and fade reopen.');
} finally {
  for (const [key, descriptor] of previous) {if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];}
}
