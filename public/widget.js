(function () {
  'use strict';

  var script = document.currentScript;
  var scriptUrl = script ? script.src : '';

  function getBase() {
    if (script) {
      var b = script.getAttribute('data-base');
      if (b) return b.replace(/\/$/, '');
    }
    try {
      return new URL(scriptUrl).origin;
    } catch (_) {
      return window.location.origin;
    }
  }

  function getBusinessKey() {
    if (script) {
      var url = new URL(scriptUrl);
      return url.searchParams.get('salon') || url.searchParams.get('b') || '';
    }
    return '';
  }

  var BASE = getBase();
  var defaultKey = getBusinessKey();

  function openBooking(key, serviceId) {
    var slug = key || defaultKey;
    if (!slug) return;

    var src = BASE + '/' + encodeURIComponent(slug) + '/book';
    if (serviceId) src += '?service=' + encodeURIComponent(serviceId);

    var overlay = document.createElement('div');
    overlay.id = 'booking-overlay';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:999999',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:rgba(0,0,0,0.55)',
      'backdrop-filter:blur(4px)',
      '-webkit-backdrop-filter:blur(4px)',
      'animation:booking-fade-in .2s ease',
    ].join(';');

    var isMobile = window.innerWidth < 640;

    var frame = document.createElement('iframe');
    frame.src = src;
    frame.setAttribute('allow', 'payment');
    frame.setAttribute('loading', 'eager');
    frame.style.cssText = isMobile
      ? [
          'width:100%',
          'height:100%',
          'border:none',
          'background:#fff',
          'position:fixed',
          'inset:0',
        ].join(';')
      : [
          'width:min(520px,96vw)',
          'height:min(760px,94vh)',
          'border:none',
          'border-radius:16px',
          'background:#fff',
          'box-shadow:0 24px 80px rgba(0,0,0,0.35)',
        ].join(';');

    overlay.appendChild(frame);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    function close() {
      if (!document.body.contains(overlay)) return;
      document.body.removeChild(overlay);
      document.body.style.overflow = '';
      window.removeEventListener('message', onMessage);
      overlay.removeEventListener('click', onBackdropClick);
    }

    function onMessage(e) {
      if (e.data && (e.data.type === 'booking:close' || e.data.type === 'clicka:close')) close();
    }

    function onBackdropClick(e) {
      if (e.target === overlay) close();
    }

    window.addEventListener('message', onMessage);
    overlay.addEventListener('click', onBackdropClick);
  }

  function attachButtons() {
    var buttons = document.querySelectorAll('[data-book],[data-clicka-book]');
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        if (btn._bookingAttached) return;
        btn._bookingAttached = true;
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          var key = btn.getAttribute('data-salon') || btn.getAttribute('data-clicka-salon') || defaultKey;
          var service = btn.getAttribute('data-service') || btn.getAttribute('data-clicka-service') || '';
          openBooking(key, service);
        });
      })(buttons[i]);
    }
  }

  var style = document.createElement('style');
  style.textContent = '@keyframes booking-fade-in{from{opacity:0}to{opacity:1}}';
  document.head.appendChild(style);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachButtons);
  } else {
    attachButtons();
  }

  window.Booking = { open: openBooking, attach: attachButtons };
  window.clicka = window.Booking;
})();
