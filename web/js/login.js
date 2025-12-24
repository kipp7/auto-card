$(document).ready(function () {
  function setTab(tab) {
    if (tab === 'register') {
      $('#tabRegister').removeClass('btn-outline-dark').addClass('btn-dark');
      $('#tabLogin').removeClass('btn-dark').addClass('btn-outline-dark');
      $('#registerForm').removeClass('d-none');
      $('#loginForm').addClass('d-none');
      return;
    }

    $('#tabLogin').removeClass('btn-outline-dark').addClass('btn-dark');
    $('#tabRegister').removeClass('btn-dark').addClass('btn-outline-dark');
    $('#loginForm').removeClass('d-none');
    $('#registerForm').addClass('d-none');
  }

  function saveAuth(data) {
    if (data && data.token) localStorage.setItem('authToken', data.token);
    if (data && data.username) localStorage.setItem('userName', data.username);
  }

  $('#tabLogin').on('click', function () {
    setTab('login');
  });

  $('#tabRegister').on('click', function () {
    setTab('register');
  });

  $('#loginForm').on('submit', function (e) {
    e.preventDefault();
    var username = $('#loginUsername').val();
    var password = $('#loginPassword').val();

    http
      .post('/api/c/auth/login', { username: username, password: password })
      .then(function (data) {
        saveAuth(data);
        app.showSuccess('登录成功');
        setTimeout(function () {
          window.location.href = 'me.html';
        }, 600);
      })
      .catch(function (err) {
        app.showError(err && err.message ? err.message : '登录失败');
      });
  });

  $('#registerForm').on('submit', function (e) {
    e.preventDefault();
    var username = $('#registerUsername').val();
    var password = $('#registerPassword').val();

    http
      .post('/api/c/auth/register', { username: username, password: password })
      .then(function (data) {
        saveAuth(data);
        app.showSuccess('注册成功');
        setTimeout(function () {
          window.location.href = 'me.html';
        }, 600);
      })
      .catch(function (err) {
        app.showError(err && err.message ? err.message : '注册失败');
      });
  });

  setTab('login');
});

