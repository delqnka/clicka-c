(function () {
  'use strict';

  var script = document.currentScript;

  function trimSlash(value) {
    return String(value || '').replace(/\/+$/, '');
  }

  function getBaseUrl() {
    if (script && script.getAttribute('data-engine-url')) {
      return trimSlash(script.getAttribute('data-engine-url'));
    }
    if (script && script.getAttribute('data-base')) {
      return trimSlash(script.getAttribute('data-base'));
    }
    try {
      return trimSlash(new URL(script.src).origin);
    } catch (_) {
      return trimSlash(window.location.origin);
    }
  }

  function getDefaultSlug() {
    if (script && script.getAttribute('data-salon')) {
      return String(script.getAttribute('data-salon'));
    }
    try {
      var url = new URL(script.src);
      return url.searchParams.get('salon') || url.searchParams.get('b') || '';
    } catch (_) {
      return '';
    }
  }

  var BASE = getBaseUrl();
  var defaultSlug = getDefaultSlug();
  var TRANSLATIONS = {
    bg: {
      close: 'Затвори',
      title: 'Резервация',
      subtitle: 'Изберете услуга, ден и свободен час.',
      service: 'Услуга',
      date: 'Дата',
      time: 'Час',
      name: 'Име',
      phone: 'Телефон',
      email: 'Имейл',
      notes: 'Бележка',
      notesPlaceholder: 'Бележка (по желание)',
      noSlots: 'Няма свободни часове',
      submit: 'Потвърди резервация',
      saving: 'Записваме резервацията...',
      success: 'Резервацията е изпратена успешно.',
      genericBooking: 'Резервация',
      serviceFallback: 'Услуга',
      loadFailed: 'Не можем да заредим резервациите.',
      bookingFailed: 'Неуспешна резервация. Опитайте отново.',
      priceSuffix: 'EUR',
    },
    en: {
      close: 'Close',
      title: 'Booking',
      subtitle: 'Choose a service, date and available time.',
      service: 'Service',
      date: 'Date',
      time: 'Time',
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      notes: 'Notes',
      notesPlaceholder: 'Notes (optional)',
      noSlots: 'No available time slots',
      submit: 'Confirm booking',
      saving: 'Saving your booking...',
      success: 'Your booking request was sent successfully.',
      genericBooking: 'Booking',
      serviceFallback: 'Service',
      loadFailed: 'We could not load booking data.',
      bookingFailed: 'Booking failed. Please try again.',
      priceSuffix: 'EUR',
    },
  };

  function normalizeLocale(value) {
    var normalized = String(value || '').trim().toLowerCase();
    return normalized === 'en' || normalized.indexOf('en-') === 0 ? 'en' : 'bg';
  }

  function getConfiguredLocale() {
    if (script && script.getAttribute('data-locale')) {
      return normalizeLocale(script.getAttribute('data-locale'));
    }
    var langAttr = document.documentElement && document.documentElement.getAttribute('lang');
    if (langAttr) return normalizeLocale(langAttr);
    if (window.navigator && window.navigator.language) {
      return normalizeLocale(window.navigator.language);
    }
    return 'bg';
  }

  function request(path, init) {
    return fetch(BASE + path, {
      method: init && init.method ? init.method : 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, init && init.headers ? init.headers : {}),
      body: init && init.body,
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (payload) {
        if (!response.ok) {
          throw new Error(payload && payload.error ? payload.error : 'Request failed');
        }
        return payload;
      });
    });
  }

  function normalizeService(service) {
    var price = Number(service.price || service.service_price || 0);
    var duration = Number(service.durationMin || service.duration_min || service.duration || service.service_duration || 30);
    return {
      id: String(service.id || service.name || ''),
      name: String(service.name || service.title || 'Service'),
      price: Number.isFinite(price) ? price : 0,
      duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 30,
    };
  }

  function getServices(salon) {
    var raw = salon && Array.isArray(salon.services) ? salon.services : [];
    return raw.map(normalizeService).filter(function (service) { return service.name; });
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function toMinutes(time) {
    var parts = String(time || '').split(':');
    if (parts.length < 2) return null;
    var hours = Number(parts[0]);
    var minutes = Number(parts[1]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  }

  function overlaps(start, duration, occupied) {
    var end = start + duration;
    return occupied.some(function (item) {
      var occupiedStart = toMinutes(item.time);
      var occupiedDuration = Math.max(5, Number(item.duration || 30));
      if (occupiedStart == null) return false;
      return start < occupiedStart + occupiedDuration && end > occupiedStart;
    });
  }

  function buildSlots(duration, occupied) {
    var slots = [];
    for (var mins = 9 * 60; mins <= 18 * 60 - duration; mins += 30) {
      if (!overlaps(mins, duration, occupied || [])) {
        slots.push(pad(Math.floor(mins / 60)) + ':' + pad(mins % 60));
      }
    }
    return slots;
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'style') node.style.cssText = attrs[key];
      else if (key === 'className') node.className = attrs[key];
      else if (key === 'text') node.textContent = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) {
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function option(value, label) {
    return el('option', { value: value, text: label });
  }

  function setMessage(node, text, tone) {
    node.textContent = text || '';
    node.className = tone ? 'be-message be-message-' + tone : 'be-message';
  }

  function openBooking(slugOverride, serviceId) {
    var slug = String(slugOverride || defaultSlug || '').trim();
    if (!slug) return;

    var state = { salon: null, services: [], occupied: [] };
    var locale = getConfiguredLocale();
    var text = TRANSLATIONS[locale] || TRANSLATIONS.bg;
    var overlay = el('div', { className: 'be-overlay' });
    var panel = el('div', { className: 'be-panel' });
    var close = el('button', { className: 'be-close', type: 'button', 'aria-label': text.close, text: 'x' });
    var title = el('h2', { className: 'be-title', text: text.title });
    var subtitle = el('p', { className: 'be-subtitle', text: text.subtitle });
    var form = el('form', { className: 'be-form' });
    var service = el('select', { name: 'service', required: 'required' });
    var date = el('input', { name: 'date', type: 'date', min: today(), value: today(), required: 'required' });
    var time = el('select', { name: 'time', required: 'required' });
    var name = el('input', { name: 'clientName', type: 'text', placeholder: text.name, required: 'required' });
    var phone = el('input', { name: 'clientPhone', type: 'tel', placeholder: text.phone, required: 'required' });
    var email = el('input', { name: 'clientEmail', type: 'email', placeholder: text.email, required: 'required' });
    var notes = el('textarea', { name: 'notes', placeholder: text.notesPlaceholder, rows: '3' });
    var message = el('p', { className: 'be-message' });
    var submit = el('button', { className: 'be-submit', type: 'submit', text: text.submit });

    function closeModal() {
      document.body.style.overflow = '';
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    function selectedService() {
      return state.services.find(function (item) { return item.id === service.value; }) || state.services[0];
    }

    function renderSlots() {
      var current = selectedService();
      time.innerHTML = '';
      buildSlots(current ? current.duration : 30, state.occupied).forEach(function (slot) {
        time.appendChild(option(slot, slot));
      });
      if (!time.children.length) {
        time.appendChild(option('', text.noSlots));
      }
    }

    function loadSlots() {
      var currentDate = date.value || today();
      return request('/api/public/salons/' + encodeURIComponent(slug) + '/slots?date=' + encodeURIComponent(currentDate))
        .then(function (payload) {
          state.occupied = payload && Array.isArray(payload.occupied) ? payload.occupied : [];
          renderSlots();
        })
        .catch(function () {
          state.occupied = [];
          renderSlots();
        });
    }

    function renderServices() {
      service.innerHTML = '';
      state.services.forEach(function (item) {
        var price = item.price ? ' · ' + item.price + ' ' + text.priceSuffix : '';
        service.appendChild(option(item.id, item.name + price));
      });
      if (serviceId) service.value = String(serviceId);
      if (!service.value && state.services[0]) service.value = state.services[0].id;
    }

    close.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeModal();
    });
    service.addEventListener('change', renderSlots);
    date.addEventListener('change', loadSlots);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var current = selectedService();
      if (!current || !time.value) return;
      submit.disabled = true;
      setMessage(message, text.saving, '');
      request('/api/public/bookings', {
        method: 'POST',
        body: JSON.stringify({
          salonSlug: slug,
          clientName: name.value,
          clientPhone: phone.value,
          clientEmail: email.value,
          serviceName: current.name,
          servicePrice: current.price,
          serviceDuration: current.duration,
          date: date.value,
          time: time.value,
          notes: notes.value,
        }),
      }).then(function () {
        setMessage(message, text.success, 'success');
        form.reset();
        date.value = today();
        return loadSlots();
      }).catch(function (error) {
        setMessage(message, error.message || text.bookingFailed, 'error');
      }).finally(function () {
        submit.disabled = false;
      });
    });

    var serviceLabel = el('label', { text: text.service }, [service]);
    var dateLabel = el('label', { text: text.date }, [date]);
    var timeLabel = el('label', { text: text.time }, [time]);
    var nameLabel = el('label', { text: text.name }, [name]);
    var phoneLabel = el('label', { text: text.phone }, [phone]);
    var emailLabel = el('label', { text: text.email }, [email]);
    var notesLabel = el('label', { text: text.notes }, [notes]);
    form.appendChild(serviceLabel);
    form.appendChild(dateLabel);
    form.appendChild(timeLabel);
    form.appendChild(nameLabel);
    form.appendChild(phoneLabel);
    form.appendChild(emailLabel);
    form.appendChild(notesLabel);
    form.appendChild(message);
    form.appendChild(submit);
    panel.appendChild(close);
    panel.appendChild(title);
    panel.appendChild(subtitle);
    panel.appendChild(form);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    request('/api/public/salons/' + encodeURIComponent(slug)).then(function (payload) {
      state.salon = payload && payload.salon ? payload.salon : null;
      locale = normalizeLocale(state.salon && state.salon.language ? state.salon.language : locale);
      text = TRANSLATIONS[locale] || TRANSLATIONS.bg;
      close.setAttribute('aria-label', text.close);
      if (!state.salon || !state.salon.name) title.textContent = text.title;
      subtitle.textContent = text.subtitle;
      serviceLabel.firstChild.textContent = text.service;
      dateLabel.firstChild.textContent = text.date;
      timeLabel.firstChild.textContent = text.time;
      nameLabel.firstChild.textContent = text.name;
      phoneLabel.firstChild.textContent = text.phone;
      emailLabel.firstChild.textContent = text.email;
      notesLabel.firstChild.textContent = text.notes;
      name.setAttribute('placeholder', text.name);
      phone.setAttribute('placeholder', text.phone);
      email.setAttribute('placeholder', text.email);
      notes.setAttribute('placeholder', text.notesPlaceholder);
      submit.textContent = text.submit;
      state.services = getServices(state.salon);
      if (!state.services.length) {
        state.services = [{ id: 'booking', name: text.genericBooking, price: 0, duration: 30 }];
      }
      if (state.salon && state.salon.name) title.textContent = String(state.salon.name);
      renderServices();
      return loadSlots();
    }).catch(function (error) {
      setMessage(message, error.message || text.loadFailed, 'error');
    });
  }

  function attachButtons() {
    var buttons = document.querySelectorAll('[data-book]');
    for (var i = 0; i < buttons.length; i += 1) {
      (function (button) {
        if (button.__bookingAttached) return;
        button.__bookingAttached = true;
        button.addEventListener('click', function (event) {
          event.preventDefault();
          openBooking(button.getAttribute('data-salon') || defaultSlug, button.getAttribute('data-service') || '');
        });
      })(buttons[i]);
    }
  }

  var style = document.createElement('style');
  style.textContent = [
    '.be-overlay{position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.56);padding:16px}',
    '.be-panel{position:relative;width:min(480px,100%);max-height:min(760px,94vh);overflow:auto;background:#fff;color:#111;border-radius:14px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.35);font-family:system-ui,-apple-system,Segoe UI,sans-serif}',
    '.be-close{position:absolute;top:10px;right:10px;width:34px;height:34px;border:0;background:#f3f4f6;border-radius:999px;cursor:pointer;font-size:18px}',
    '.be-title{margin:0 38px 4px 0;font-size:22px;line-height:1.2}',
    '.be-subtitle{margin:0 0 18px;color:#555;font-size:14px}',
    '.be-form{display:grid;gap:12px}',
    '.be-form label{display:grid;gap:6px;font-size:13px;font-weight:700;color:#333}',
    '.be-form input,.be-form select,.be-form textarea{width:100%;border:1px solid #d1d5db;border-radius:10px;padding:11px 12px;font:inherit;background:#fff;color:#111}',
    '.be-submit{border:0;border-radius:10px;background:#111;color:#fff;padding:12px 16px;font-weight:800;cursor:pointer}',
    '.be-submit:disabled{opacity:.6;cursor:wait}',
    '.be-message{min-height:18px;margin:0;font-size:13px;color:#555}',
    '.be-message-success{color:#047857}',
    '.be-message-error{color:#b91c1c}',
  ].join('');
  document.head.appendChild(style);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachButtons);
  } else {
    attachButtons();
  }

  window.Booking = { open: openBooking, attach: attachButtons };
})();
