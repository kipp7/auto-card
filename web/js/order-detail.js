$(document).ready(function () {
  var orderId = app.getQueryParam('id');
  var buyerPhone = app.getQueryParam('buyerPhone') || '';
  var token = localStorage.getItem('authToken') || '';

  if (!orderId) {
    app.showError('缺少订单ID');
    return;
  }

  function formatPrice(value) {
    var n = Number(value);
    if (Number.isNaN(n)) return String(value || '');
    return n.toFixed(2);
  }

  function formatSeconds(sec) {
    var s = Math.max(0, Number(sec) || 0);
    var m = Math.floor(s / 60);
    var r = s % 60;
    return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
  }

  function formatPaymentMethod(method) {
    if (method === 'wechat') return '微信';
    if (method === 'alipay') return '支付宝';
    if (method === 'qq') return 'QQ';
    return method || '-';
  }

  function setStatusBadge(order) {
    var badge = app.formatOrderStatus(order.status, order.payStatus, order.refundStatus);
    $('#statusBadge').removeClass('bg-secondary bg-success bg-warning text-dark');
    $('#statusBadge').addClass(badge.className).text(badge.text);
  }

  function renderOrder(order) {
    $('#orderNo').text(order.orderNo || '-');
    $('#productName').text(order.productName || '-');
    $('#orderAmount').text('¥' + formatPrice(order.orderAmount));
    var originalAmount = Number(order.originalAmount || 0);
    var discountAmount = Number(order.discountAmount || 0);
    $('#originalAmount').text(originalAmount > 0 ? '￥' + formatPrice(originalAmount) : '-');
    $('#discountAmount').text(discountAmount > 0 ? '-￥' + formatPrice(discountAmount) : '-');
    $('#buyerPhone').text(order.buyerPhone || '-');
    $('#paymentMethod').text(formatPaymentMethod(order.paymentMethod));
    $('#createdAt').text(order.createdAt || '-');
    $('#paidAt').text(order.paidAt || '-');
    setStatusBadge(order);

    if (order.cardNumber) {
      $('#cardNumberSection').removeClass('d-none');
      $('#cardNumber').text(order.cardNumber);
      $('#paySection').addClass('d-none');
    } else if (order.status !== 'cancelled') {
      $('#paySection').removeClass('d-none');
      $('#cardNumberSection').addClass('d-none');
      var payHref =
        'pay.html?orderId=' +
        encodeURIComponent(order.orderId) +
        (buyerPhone ? '&buyerPhone=' + encodeURIComponent(buyerPhone) : '');
      $('#payLink').attr('href', payHref);

      var left = Number(order.expiresInSeconds) || 0;
      if (left > 0) {
        $('#paySectionHint').text('剩余支付时间：' + formatSeconds(left) + '（演示版：支付成功后将展示卡密）');
        $('#payLink').removeClass('disabled').attr('aria-disabled', 'false');
        $('#cancelOrderBtn').prop('disabled', false);
      } else {
        $('#paySectionHint').text('订单已超时，已不可支付。可点击“取消订单”释放库存。');
        $('#payLink').addClass('disabled').attr('aria-disabled', 'true');
        $('#cancelOrderBtn').prop('disabled', false);
      }
    } else {
      $('#paySection').addClass('d-none');
      $('#cardNumberSection').addClass('d-none');
    }
  }

  function cancelOrder() {
    var body = buyerPhone ? { buyerPhone: buyerPhone } : {};
    return http
      .post('/api/c/orders/' + encodeURIComponent(orderId) + '/cancel', body)
      .then(function () {
        app.showSuccess('已取消');
        loadOrder();
      })
      .catch(function (err) {
        app.showError(err && err.message ? err.message : '取消失败');
      });
  }

  function loadOrder() {
    var params = {};
    if (!token && buyerPhone) params.buyerPhone = buyerPhone;

    http
      .get('/api/c/orders/' + encodeURIComponent(orderId), params)
      .then(function (order) {
        renderOrder(order);
      })
      .catch(function (err) {
        app.showError(err && err.message ? err.message : '加载失败');
      });
  }

  $('#copyBtn').on('click', function () {
    var text = $('#cardNumber').text();
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(function () {
          app.showSuccess('已复制');
        })
        .catch(function () {
          app.showError('复制失败');
        });
      return;
    }

    var temp = document.createElement('textarea');
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    try {
      document.execCommand('copy');
      app.showSuccess('已复制');
    } catch {
      app.showError('复制失败');
    } finally {
      document.body.removeChild(temp);
    }
  });

  $('#cancelOrderBtn').on('click', function () {
    if (window.Swal) {
      window.Swal.fire({
        title: '确认取消订单？',
        text: '取消后可重新下单购买。',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '取消订单',
        cancelButtonText: '再想想',
      }).then(function (result) {
        if (result.isConfirmed) cancelOrder();
      });
      return;
    }

    if (confirm('确认取消订单？')) cancelOrder();
  });

  loadOrder();
});

