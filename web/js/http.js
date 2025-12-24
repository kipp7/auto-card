(function () {
  function getToken() {
    return localStorage.getItem('authToken') || '';
  }

  function buildUrl(url, params) {
    if (!params) return url;
    const usp = new URLSearchParams();
    Object.keys(params).forEach(function (key) {
      const value = params[key];
      if (value === undefined || value === null || value === '') return;
      usp.append(key, String(value));
    });
    const qs = usp.toString();
    if (!qs) return url;
    return url.indexOf('?') === -1 ? url + '?' + qs : url + '&' + qs;
  }

  function request(method, path, data, params) {
    var baseUrl = (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) || '';
    var url = buildUrl(baseUrl.replace(/\/$/, '') + path, params);
    var token = getToken();

    return $.ajax({
      url: url,
      method: method,
      contentType: 'application/json',
      data: data ? JSON.stringify(data) : undefined,
      headers: token ? { Authorization: 'Bearer ' + token } : {},
    }).then(
      function (resp) {
        if (resp && resp.code === 0) return resp.data;
        return $.Deferred().reject(resp || { message: '请求失败' });
      },
      function (xhr) {
        var resp = xhr && xhr.responseJSON ? xhr.responseJSON : null;
        return $.Deferred().reject(resp || { code: xhr.status, message: '请求失败' });
      },
    );
  }

  window.http = {
    get: function (path, params) {
      return request('GET', path, null, params);
    },
    post: function (path, data, params) {
      return request('POST', path, data, params);
    },
    put: function (path, data, params) {
      return request('PUT', path, data, params);
    },
    patch: function (path, data, params) {
      return request('PATCH', path, data, params);
    },
    del: function (path, params) {
      return request('DELETE', path, null, params);
    },
  };
})();

