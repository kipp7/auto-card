$(document).ready(function () {
  var token = localStorage.getItem('authToken') || '';

  function showNotLogin() {
    $('#notLoginCard').removeClass('d-none');
    $('#profileCard').addClass('d-none');
  }

  function showProfile(username) {
    $('#userName').text(username || '-');
    $('#profileCard').removeClass('d-none');
    $('#notLoginCard').addClass('d-none');
  }

  if (!token) {
    showNotLogin();
    return;
  }

  http
    .get('/api/c/auth/me')
    .then(function (data) {
      showProfile(data.username);
    })
    .catch(function (err) {
      if (err && err.code === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userName');
        showNotLogin();
        return;
      }
      app.showError(err && err.message ? err.message : '加载失败');
    });

  $('#logoutBtn').on('click', function () {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    showNotLogin();
  });
});

