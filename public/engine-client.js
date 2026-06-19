(function () {
  'use strict';

  var script = document.currentScript;

  function trimSlash(value) {
    return String(value || '').replace(/\/+$/, '');
  }

  function getBaseUrl(options) {
    if (options && options.baseUrl) return trimSlash(options.baseUrl);
    if (script && script.getAttribute('data-engine-url')) {
      return trimSlash(script.getAttribute('data-engine-url'));
    }
    try {
      return trimSlash(new URL(script.src).origin);
    } catch (_) {
      return trimSlash(window.location.origin);
    }
  }

  function getSalonSlug(options) {
    if (options && options.salonSlug) return String(options.salonSlug);
    if (options && options.slug) return String(options.slug);
    if (script && script.getAttribute('data-salon')) return String(script.getAttribute('data-salon'));
    return '';
  }

  function createClient(options) {
    var baseUrl = getBaseUrl(options);
    var defaultSlug = getSalonSlug(options);

    function requireSlug(slug) {
      var value = String(slug || defaultSlug || '').trim();
      if (!value) throw new Error('Missing salon slug');
      return value;
    }

    async function request(path, init) {
      var response = await fetch(baseUrl + path, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init && init.headers ? init.headers : {}),
        },
      });
      var payload = await response.json().catch(function () { return null; });
      if (!response.ok) {
        var message = payload && payload.error ? payload.error : 'Request failed';
        throw new Error(message);
      }
      return payload;
    }

    return {
      getSalon: function (slug) {
        return request('/api/public/salons/' + encodeURIComponent(requireSlug(slug)));
      },

      getStaff: function (slug) {
        return request('/api/public/salons/' + encodeURIComponent(requireSlug(slug)) + '/staff');
      },

      getSlots: function (params) {
        params = params || {};
        var slug = requireSlug(params.salonSlug || params.slug);
        var date = String(params.date || '').trim();
        if (!date) throw new Error('Missing date');

        var search = new URLSearchParams({ date: date });
        if (params.staffMemberId) search.set('staffMemberId', String(params.staffMemberId));

        return request(
          '/api/public/salons/' + encodeURIComponent(slug) + '/slots?' + search.toString(),
        );
      },

      createBooking: function (booking) {
        return request('/api/public/bookings', {
          method: 'POST',
          body: JSON.stringify({
            ...booking,
            salonSlug: requireSlug(booking && (booking.salonSlug || booking.slug)),
          }),
        });
      },
    };
  }

  window.BookingEngine = {
    createClient: createClient,
    client: createClient(),
  };
})();
