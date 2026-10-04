// The existing Apps Script receives one form-encoded JSON field named "payload".
// Keep this transport independent of tab/language rendering so a request is sent once.
export function createRSVP(root, { t, endpoint, gsap, reducedMotion = false }) {
  const answers = { attending: '', guestCount: 1, guestNames: [''], transport: '', lodging: '', lodgingCount: 1, dietary: '', music: '', message: '' };
  let step = 0, review = false, status = 'editing', error = '', invalidSelector = '';
  let cleanupRequest = null;
  const keys = ['rsvpParticipation', 'rsvpGuests', 'rsvpTransport', 'rsvpAccommodation', 'rsvpDetails'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const text = key => esc(t(key));
  const total = () => answers.attending === 'no' ? 2 : keys.length;
  const isLast = () => step === total() - 1;
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  const choice = (field, value, label) => `<label class="w-choice"><input type="radio" name="${field}" value="${value}" ${answers[field] === value ? 'checked' : ''} required><span>${text(label)}</span></label>`;
  const countControl = (field, label, max) => `<div class="w-count"><button type="button" data-count="${field}" data-delta="-1" aria-label="${text('rsvpDecrease')}" ${answers[field] <= 1 ? 'disabled' : ''}>−</button><label><span class="w-form-label">${text(label)}</span><input class="w-input" type="number" name="${field}" value="${answers[field]}" min="1" max="${max}" inputmode="numeric" required></label><button type="button" data-count="${field}" data-delta="1" aria-label="${text('rsvpIncrease')}" ${answers[field] >= max ? 'disabled' : ''}>+</button></div>`;
  const namesMarkup = () => Array.from({ length: answers.guestCount }, (_, i) => `<label class="w-form-label" for="w-guest-${i}">${text('rsvpGuestName')} ${i + 1}<input class="w-input" id="w-guest-${i}" name="guestName${i}" data-name-index="${i}" value="${esc(answers.guestNames[i])}" autocomplete="name" maxlength="70" required></label>`).join('');

  function clearError() {
    error = ''; invalidSelector = '';
    root.querySelectorAll('[aria-invalid="true"]').forEach(input => {
      input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby');
    });
    const el = root.querySelector('.w-form-error');
    if (el) { el.textContent = ''; el.hidden = true; }
  }

  function summary() {
    const row = (label, value) => `<div><dt>${text(label)}</dt><dd>${esc(value)}</dd></div>`;
    return `<dl class="w-rsvp-summary">${row('rsvpParticipation', t(answers.attending === 'yes' ? 'rsvpYes' : 'rsvpNo'))}${row('rsvpGuests', answers.guestNames.slice(0, answers.guestCount).map(n => n.trim()).join(', '))}${answers.attending === 'yes' ? `${row('rsvpTransport', t(answers.transport === 'bus' ? 'rsvpBus' : 'rsvpDirect'))}${row('rsvpAccommodation', t(answers.lodging === 'yes' ? 'rsvpLodgingYes' : 'rsvpLodgingNo'))}${answers.lodging === 'yes' ? row('rsvpLodgingCount', answers.lodgingCount) : ''}${answers.dietary.trim() ? row('rsvpDietary', answers.dietary) : ''}${answers.music.trim() ? row('rsvpMusic', answers.music) : ''}${answers.message.trim() ? row('rsvpMessage', answers.message) : ''}` : ''}</dl>`;
  }

  function stepMarkup() {
    if (review) return `<h3 class="w-rsvp-heading" tabindex="-1">${text('rsvpReviewTitle')}</h3>${summary()}<p class="w-form-note">${text('rsvpPrivacy')}</p>`;
    if (step === 0) return `<h3 class="w-rsvp-heading" tabindex="-1">${text('rsvpAttendanceQuestion')}</h3><fieldset class="w-choices"><legend class="w-form-label">${text('rsvpChooseOne')}</legend>${choice('attending', 'yes', 'rsvpYes')}${choice('attending', 'no', 'rsvpNo')}</fieldset>`;
    if (step === 1) return `<h3 class="w-rsvp-heading" tabindex="-1">${text(answers.attending === 'no' ? 'rsvpNamesDeclining' : 'rsvpNamesAttending')}</h3><p class="w-form-note">${text(answers.attending === 'no' ? 'rsvpNamesDecliningNote' : 'rsvpNamesNote')}</p>${countControl('guestCount', 'rsvpGuestCount', 12)}<div class="w-guest-names">${namesMarkup()}</div>`;
    if (step === 2) return `<h3 class="w-rsvp-heading" tabindex="-1">${text('rsvpTransportQuestion')}</h3><p class="w-form-note">${text('rsvpTransportNote')}</p><fieldset class="w-choices"><legend class="w-form-label">${text('rsvpChooseOne')}</legend>${choice('transport', 'bus', 'rsvpBus')}${choice('transport', 'direct', 'rsvpDirect')}</fieldset>`;
    if (step === 3) return `<h3 class="w-rsvp-heading" tabindex="-1">${text('rsvpLodgingQuestion')}</h3><p class="w-form-note">${text('rsvpLodgingNote')}</p><fieldset class="w-choices"><legend class="w-form-label">${text('rsvpChooseOne')}</legend>${choice('lodging', 'yes', 'rsvpLodgingYes')}${choice('lodging', 'no', 'rsvpLodgingNo')}</fieldset>${answers.lodging === 'yes' ? `${countControl('lodgingCount', 'rsvpLodgingCount', answers.guestCount)}<p class="w-form-note">${text('rsvpLodgingDates')}</p>` : ''}`;
    return `<h3 class="w-rsvp-heading" tabindex="-1">${text('rsvpDetailsQuestion')}</h3><p class="w-form-note">${text('rsvpOptional')}</p><label class="w-form-label" for="w-dietary">${text('rsvpDietary')}<input class="w-input" id="w-dietary" name="dietary" maxlength="180" value="${esc(answers.dietary)}"></label><label class="w-form-label" for="w-music">${text('rsvpMusic')}<input class="w-input" id="w-music" name="music" maxlength="180" value="${esc(answers.music)}"></label><label class="w-form-label" for="w-message">${text('rsvpMessage')}<textarea class="w-input" id="w-message" name="message" rows="3" maxlength="500">${esc(answers.message)}</textarea></label>`;
  }

  function render(animate = false, focus = false) {
    if (status === 'success') {
      root.innerHTML = `<div class="w-rsvp w-rsvp-success" role="status"><span class="w-step-count">${text('rsvpReceived')}</span><h3 class="w-rsvp-heading" tabindex="-1">${text('rsvpThanks')}</h3><p class="w-form-note">${text(answers.attending === 'yes' ? 'rsvpThanksYes' : 'rsvpThanksNo')}</p></div>`;
    } else {
      root.innerHTML = `<form class="w-rsvp" novalidate><div class="w-rsvp-progress"><span class="w-step-count">${String(step + 1).padStart(2, '0')} / ${String(total()).padStart(2, '0')}</span><span class="w-form-label">${text(keys[step])}</span><span class="w-rsvp-track" aria-hidden="true"><i style="width:${(step + 1) / total() * 100}%"></i></span></div><div class="w-rsvp-step">${stepMarkup()}</div><p class="w-form-error" role="alert" ${error ? '' : 'hidden'}>${error ? text(error) : ''}</p>${status === 'unconfirmed' ? `<p class="w-form-note" role="status">${text('rsvpUnconfirmed')}</p>` : ''}<div class="w-form-nav">${step > 0 || review ? `<button type="button" class="w-action" data-back ${status === 'sending' ? 'disabled' : ''}>← ${text(review ? 'rsvpEdit' : 'rsvpBack')}</button>` : '<span></span>'}<button type="submit" class="w-action" ${status === 'sending' ? 'disabled' : ''}>${text(status === 'sending' ? 'rsvpSending' : status === 'unconfirmed' ? 'rsvpRetry' : review ? 'rsvpSend' : isLast() ? 'rsvpReview' : 'rsvpNext')} ${status === 'sending' ? '' : arrow}</button></div><p class="w-rsvp-status" role="status">${status === 'sending' ? text('rsvpSendingNote') : ''}</p></form>`;
      root.querySelector('form').setAttribute('aria-busy', String(status === 'sending'));
      root.querySelector('form').addEventListener('submit', onSubmit);
      root.querySelector('[data-back]')?.addEventListener('click', () => {
        if (status === 'sending') return;
        status = 'editing'; clearError();
        const editing = review;
        if (review) review = false; else step -= 1;
        render(true, true);
        if (editing) root.querySelector('input, textarea')?.focus({ preventScroll: true });
      });
      bindFields(root);
      root.querySelectorAll('[data-count]').forEach(button => {
        if (status === 'sending') button.disabled = true;
        button.addEventListener('click', () => {
          if (status === 'sending') return;
          const field = button.dataset.count;
          updateCount(field, answers[field] + Number(button.dataset.delta), true);
          root.querySelector(`[name="${field}"]`)?.focus({ preventScroll: true });
        });
      });
    }
    const heading = root.querySelector('.w-rsvp-heading');
    if (focus) {
      root.closest?.('.w-panel')?.scrollTo?.({ top: 0, behavior: 'auto' });
      heading?.focus({ preventScroll: true });
    }
    if (invalidSelector) markInvalid(root.querySelector(invalidSelector));
    const motionReduced = typeof reducedMotion === 'boolean' ? reducedMotion : reducedMotion?.matches;
    if (animate && gsap && !motionReduced) gsap.fromTo(root.querySelector('.w-rsvp-step') || heading, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.28, ease: 'power1.out' });
  }

  function setCount(field, value) {
    const max = field === 'guestCount' ? 12 : answers.guestCount;
    answers[field] = Math.max(1, Math.min(max, Math.round(Number(value) || 1)));
    if (field === 'guestCount') {
      answers.guestNames.length = answers.guestCount;
      answers.lodgingCount = Math.min(answers.lodgingCount, answers.guestCount);
    }
    clearError();
  }

  function bindFields(container) {
    container.querySelectorAll('input, textarea').forEach(input => {
      input.disabled = status === 'sending';
      input.addEventListener('input', onInput);
      input.addEventListener('change', onChange);
    });
  }

  function updateCount(field, value, normalize = false) {
    const previous = answers[field];
    setCount(field, value);
    if (normalize) root.querySelector(`[name="${field}"]`).value = String(answers[field]);
    if (field === 'guestCount' && previous !== answers.guestCount) {
      const names = root.querySelector('.w-guest-names');
      names.innerHTML = namesMarkup();
      bindFields(names);
    }
    const max = field === 'guestCount' ? 12 : answers.guestCount;
    root.querySelectorAll(`[data-count="${field}"]`).forEach(button => {
      button.disabled = Number(button.dataset.delta) < 0 ? answers[field] <= 1 : answers[field] >= max;
    });
  }

  function onInput(event) {
    const input = event.currentTarget;
    if (input.type === 'number') {
      if (input.value.trim() !== '' && Number.isFinite(Number(input.value))) updateCount(input.name, input.value);
      return;
    }
    if (input.dataset.nameIndex !== undefined) answers.guestNames[Number(input.dataset.nameIndex)] = input.value;
    else if (['dietary', 'music', 'message'].includes(input.name)) answers[input.name] = input.value;
    clearError();
  }

  function onChange(event) {
    const input = event.currentTarget;
    if (input.type === 'radio') {
      answers[input.name] = input.value;
      clearError();
      if (input.name === 'lodging' || input.name === 'attending') {
        render();
        root.querySelector(`input[name="${input.name}"][value="${input.value}"]`)?.focus({ preventScroll: true });
      }
    } else if (input.type === 'number') {
      updateCount(input.name, input.value, true);
    }
  }

  function markInvalid(input) {
    const feedback = root.querySelector('.w-form-error');
    if (feedback) feedback.id = 'w-rsvp-error';
    input?.setAttribute('aria-invalid', 'true');
    input?.setAttribute('aria-describedby', 'w-rsvp-error');
  }

  function invalid(key, selector) {
    error = key; invalidSelector = selector;
    const feedback = root.querySelector('.w-form-error');
    feedback.textContent = t(key); feedback.hidden = false;
    const input = root.querySelector(selector);
    markInvalid(input);
    input?.focus({ preventScroll: false });
    return false;
  }

  function validateStep() {
    if (step === 0 && !answers.attending) return invalid('rsvpAttendanceError', '[name="attending"]');
    if (step === 1) {
      const missing = Array.from({ length: answers.guestCount }, (_, i) => String(answers.guestNames[i] || '').trim()).findIndex(name => !name);
      if (missing >= 0) return invalid('rsvpNamesError', `[data-name-index="${missing}"]`);
    }
    if (step === 2 && !answers.transport) return invalid('rsvpTransportError', '[name="transport"]');
    if (step === 3 && !answers.lodging) return invalid('rsvpLodgingError', '[name="lodging"]');
    return true;
  }

  function onSubmit(event) {
    event.preventDefault();
    if (status === 'sending' || status === 'success') return;
    clearError();
    if (review) { send(); return; }
    if (!validateStep()) return;
    status = 'editing';
    if (isLast()) review = true; else step += 1;
    render(true, true);
  }

  function send() {
    if (status === 'sending') return;
    if (!endpoint) { error = 'rsvpUnavailable'; render(); return; }
    const guestNames = Array.from({ length: answers.guestCount }, (_, i) => String(answers.guestNames[i] || '').trim());
    if (!answers.attending || guestNames.some(name => !name) || (answers.attending === 'yes' && (!answers.transport || !answers.lodging))) {
      review = false; step = !answers.attending ? 0 : guestNames.some(name => !name) ? 1 : !answers.transport ? 2 : 3;
      render(true, true); validateStep(); return;
    }
    status = 'sending'; render();
    const frame = document.createElement('iframe');
    frame.name = `sm-rsvp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    frame.title = t('rsvpSubmissionFrame'); frame.hidden = true;
    const form = document.createElement('form');
    form.method = 'POST'; form.action = endpoint; form.target = frame.name; form.hidden = true;
    const field = document.createElement('input');
    field.type = 'hidden'; field.name = 'payload';
    const attending = answers.attending === 'yes';
    field.value = JSON.stringify({ guestNames, attendance: answers.attending, transport: attending ? answers.transport : '', lodging: attending ? answers.lodging : '', lodgingCount: attending && answers.lodging === 'yes' ? answers.lodgingCount : 1, dietary: attending ? answers.dietary : '', music: attending ? answers.music : '', message: attending ? answers.message : '', website: '' });
    form.append(field); document.body.append(frame, form);
    let settled = false;
    const finish = outcome => {
      if (settled) return;
      settled = true; cleanupRequest?.(); cleanupRequest = null;
      status = outcome;
      error = outcome === 'editing' ? 'rsvpSendError' : '';
      render(true, outcome === 'success');
    };
    const onMessage = event => {
      if (event.source !== frame.contentWindow || event.data?.type !== 'sm-wedding-rsvp') return;
      finish(event.data.ok === true ? 'success' : 'editing');
    };
    // A cross-origin iframe load is not evidence that the spreadsheet saved a response.
    const timeout = setTimeout(() => finish('unconfirmed'), 25000);
    cleanupRequest = () => { clearTimeout(timeout); window.removeEventListener('message', onMessage); form.remove(); frame.remove(); };
    window.addEventListener('message', onMessage);
    try { form.submit(); } catch { finish('editing'); }
  }

  render();
  return { refreshLanguage() { render(); } };
}
