(function () {
  var fallback = 'http://localhost:3000';
  var origin = '';
  try {
    origin = window.location && window.location.origin ? String(window.location.origin) : '';
  } catch {
    origin = '';
  }

  var apiBaseUrl = origin && origin !== 'null' ? origin : fallback;
  window.APP_CONFIG = { apiBaseUrl: apiBaseUrl };
})();
