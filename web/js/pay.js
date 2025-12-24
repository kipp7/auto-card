$(document).ready(function () {
  var orderId = app.getQueryParam('orderId');
  var buyerPhone = app.getQueryParam('buyerPhone') || '';

  if (!orderId) {
    app.showError('缺少订单ID');
    return;
  }

  function formatPrice(value) {
    var n = Number(value);
    if (Number.isNaN(n)) return String(value || '');
    return n.toFixed(2);
  }

  var leftSeconds = 0;
  var timer = null;
  var canceling = false;
  var tradeNo = '';

  function renderCountdown() {
    var m = Math.floor(leftSeconds / 60);
    var s = leftSeconds % 60;
    $('#countdownText').text(String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'));
  }

  function startCountdown() {
    renderCountdown();
    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      leftSeconds -= 1;
      if (leftSeconds <= 0) {
        clearInterval(timer);
        leftSeconds = 0;
        renderCountdown();
        $('#paidBtn').prop('disabled', true);
        $('#payHint').text('订单已超时，正在取消...');
        cancelOrder('timeout');
        return;
      }
      renderCountdown();
    }, 1000);
  }

  function renderQrCode(text) {
    $('#qrcode').empty();
    new QRCode(document.getElementById('qrcode'), {
      text: text,
      width: 220,
      height: 220,
      colorDark: '#212529',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  }

  function cancelOrder(reason) {
    if (canceling) return;
    canceling = true;

    if (timer) clearInterval(timer);
    timer = null;
    leftSeconds = 0;
    renderCountdown();

    $('#cancelBtn').prop('disabled', true);
    $('#paidBtn').prop('disabled', true);
    $('#paidBtn').text('已取消');

    var body = buyerPhone ? { buyerPhone: buyerPhone } : {};
    return http
      .post('/api/c/orders/' + encodeURIComponent(orderId) + '/cancel', body)
      .then(function () {
        if (reason === 'timeout') $('#payHint').text('订单已取消（超时）。');
        else $('#payHint').text('订单已取消。');
      })
      .catch(function (err) {
        canceling = false;
        $('#cancelBtn').prop('disabled', false);
        $('#paidBtn').prop('disabled', false).text('我已完成支付');
        app.showError(err && err.message ? err.message : '取消失败');
      });
  }

  function loadOrder() {
    http
      .get('/api/c/orders/' + encodeURIComponent(orderId), buyerPhone ? { buyerPhone: buyerPhone } : {})
      .then(function (order) {
        $('#orderNo').text(order.orderNo || '-');
        $('#orderAmount').text('¥' + formatPrice(order.orderAmount));
        $('#productName').text(order.productName || '-');
        $('#buyerPhoneText').text(order.buyerPhone ? '手机号：' + order.buyerPhone : '');
        var originalAmount = Number(order.originalAmount || 0);
        var discountAmount = Number(order.discountAmount || 0);
        if (!Number.isNaN(originalAmount) && !Number.isNaN(discountAmount) && discountAmount > 0) {
          $('#originalAmount').text('￥' + formatPrice(originalAmount));
          $('#discountAmount').text('-￥' + formatPrice(discountAmount));
          $('#originalAmountRow').removeClass('d-none');
          $('#discountAmountRow').removeClass('d-none');
        } else {
          $('#originalAmountRow').addClass('d-none');
          $('#discountAmountRow').addClass('d-none');
        }

        renderQrCode('PAY://' + (order.orderNo || String(orderId)));

        if (order.payStatus === 'paid') {
          $('#paidBtn').prop('disabled', true).text('已支付');
          $('#cancelBtn').prop('disabled', true);
          $('#payHint').html(
            '订单已完成，<a href="order-detail.html?id=' +
              encodeURIComponent(order.orderId) +
              (buyerPhone ? '&buyerPhone=' + encodeURIComponent(buyerPhone) : '') +
              '">查看详情</a>',
          );
          return;
        }

        if (order.status === 'cancelled') {
          $('#paidBtn').prop('disabled', true).text('已取消');
          $('#cancelBtn').prop('disabled', true);
          $('#payHint').text('订单已取消。');
          return;
        }

        leftSeconds = Number(order.expiresInSeconds) || 0;
        if (leftSeconds <= 0) {
          $('#paidBtn').prop('disabled', true);
          $('#payHint').text('订单已超时，正在取消...');
          cancelOrder('timeout');
          return;
        }

        startCountdown();
      })
      .catch(function (err) {
        app.showError(err && err.message ? err.message : '加载订单失败');
      });
  }

  $('#paidBtn').on('click', function () {
    if (leftSeconds <= 0) {
      $('#paidBtn').prop('disabled', true);
      app.showError('订单已超时，请重新下单');
      cancelOrder('timeout');
      return;
    }

    $('#paidBtn').prop('disabled', true);
    $('#payHint').text('正在确认支付...');
    if (!tradeNo) tradeNo = 'SIM-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

    http
      .post('/api/c/orders/' + encodeURIComponent(orderId) + '/notify', {
        success: true,
        buyerPhone: buyerPhone,
        tradeNo: tradeNo,
      })
      .then(function (order) {
        $('#payHint').text('支付成功，5秒后跳转订单详情...');
        setTimeout(function () {
          window.location.href =
            'order-detail.html?id=' +
            encodeURIComponent(order.orderId) +
            (buyerPhone ? '&buyerPhone=' + encodeURIComponent(buyerPhone) : '');
        }, 5000);
      })
      .catch(function (err) {
        $('#paidBtn').prop('disabled', false);
        app.showError(err && err.message ? err.message : '支付失败');
      });
  });

  $('#cancelBtn').on('click', function () {
    if (window.Swal) {
      window.Swal.fire({
        title: '确认取消订单？',
        text: '取消后可重新下单购买。',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '取消订单',
        cancelButtonText: '再想想',
      }).then(function (result) {
        if (result.isConfirmed) {
          cancelOrder('manual');
        }
      });
      return;
    }

    if (confirm('确认取消订单？')) cancelOrder('manual');
  });

  loadOrder();
});

