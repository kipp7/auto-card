$(document).ready(function () {
  var orderList = $('#orderList');
  var guestCard = $('#guestQueryCard');
  var statusFilter = $('#statusFilter');
  var payStatusFilter = $('#payStatusFilter');

  var state = {
    buyerPhone: '',
    token: localStorage.getItem('authToken') || '',
    lastList: [],
    timer: null,
  };

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

  function startCountdown() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }

    if (!orderList.find('.order-countdown').length) return;

    state.timer = setInterval(function () {
      orderList.find('.order-countdown').each(function () {
        var el = $(this);
        var left = Number(el.data('left')) || 0;
        if (left <= 0) {
          el.text('订单已超时');
          el.closest('.order-item').find('.js-pay').addClass('disabled').text('已超时');
          return;
        }
        left -= 1;
        el.data('left', left);
        if (left <= 0) {
          el.text('订单已超时');
          el.closest('.order-item').find('.js-pay').addClass('disabled').text('已超时');
          return;
        }
        el.text('剩余支付 ' + formatSeconds(left));
      });
    }, 1000);
  }

  function renderList(list) {
    orderList.empty();
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }

    var filtered = list;
    var status = statusFilter.val();
    if (status) {
      filtered = list.filter(function (o) {
        if (status === 'pending') return o.payStatus !== 'paid' && o.status !== 'cancelled';
        return o.status === status;
      });
    }
    var payStatus = payStatusFilter.val();
    if (payStatus) {
      filtered = filtered.filter(function (o) {
        return o.payStatus === payStatus;
      });
    }

    if (!filtered.length) {
      orderList.append('<div class="empty-state">暂无订单</div>');
      return;
    }

    filtered.forEach(function (o) {
      var badge = app.formatOrderStatus(o.status, o.payStatus, o.refundStatus);
      var originalAmount = Number(o.originalAmount || 0);
      var discountAmount = Number(o.discountAmount || 0);
      var pricingHtml = '';
      if (!Number.isNaN(discountAmount) && discountAmount > 0) {
        pricingHtml =
          '<div class="small text-muted">原价 ￥' +
          formatPrice(originalAmount) +
          ' · 优惠 -￥' +
          formatPrice(discountAmount) +
          '</div>';
      }
      var detailHref =
        'order-detail.html?id=' +
        encodeURIComponent(o.orderId) +
        (state.buyerPhone ? '&buyerPhone=' + encodeURIComponent(state.buyerPhone) : '');
      var payHref =
        'pay.html?orderId=' +
        encodeURIComponent(o.orderId) +
        (state.buyerPhone ? '&buyerPhone=' + encodeURIComponent(state.buyerPhone) : '');

      var isPending = o.payStatus !== 'paid' && o.status !== 'cancelled';
      var left = Number(o.expiresInSeconds) || 0;
      var countdownText = left > 0 ? '剩余支付 ' + formatSeconds(left) : '订单已超时';
      var countdownHtml = isPending
        ? '<div class="small text-muted order-countdown" data-left="' + left + '">' + countdownText + '</div>'
        : '';

      var actionsHtml = '';
      if (isPending) {
        var payBtn =
          left > 0
            ? '<a class="btn btn-sm btn-dark js-pay" href="' + payHref + '">去支付</a>'
            : '<span class="btn btn-sm btn-outline-secondary disabled js-pay" aria-disabled="true">已超时</span>';
        var cancelBtn = '<button class="btn btn-sm btn-outline-dark js-cancel" data-id="' + o.orderId + '">取消</button>';
        actionsHtml = payBtn + cancelBtn;
      } else {
        actionsHtml = '<a class="btn btn-sm btn-outline-dark" href="' + detailHref + '">查看</a>';
      }

      var item = `
        <div class="list-group-item order-item" data-href="${detailHref}">
          <div class="d-flex w-100 justify-content-between align-items-start gap-3">
            <div class="flex-grow-1">
              <div class="fw-semibold">${o.productName || '-'}<\/div>
              <div class="small text-muted mt-1">订单号：${o.orderNo || '-'}<\/div>
              <div class="small text-muted">下单时间：${o.createdAt || '-'}<\/div>
              ${countdownHtml}
            <\/div>
            <div class="text-end">
              <div class="fw-semibold">￥${formatPrice(o.orderAmount)}<\/div>
              ${pricingHtml}
              <span class="badge ${badge.className} mt-1">${badge.text}<\/span>
              <div class="order-actions mt-2">${actionsHtml}<\/div>
            <\/div>
          <\/div>
        <\/div>
      `;
      orderList.append(item);
    });

    startCountdown();
  }

  function cancelOrder(orderId) {
    var body = {};
    if (!state.token && state.buyerPhone) body.buyerPhone = state.buyerPhone;
    return http
      .post('/api/c/orders/' + encodeURIComponent(orderId) + '/cancel', body)
      .then(function () {
        app.showSuccess('已取消');
        loadOrders();
      })
      .catch(function (err) {
        app.showError(err && err.message ? err.message : '取消失败');
      });
  }

  function loadOrders() {
    orderList.empty();
    orderList.append('<div class="empty-state">加载中...</div>');

    var req;
    if (state.token) {
      req = http.get('/api/c/orders', { page: 1, pageSize: 20 });
    } else if (state.buyerPhone) {
      req = http.get('/api/c/orders/query', { buyerPhone: state.buyerPhone, page: 1, pageSize: 20 });
    } else {
      orderList.empty();
      orderList.append('<div class="empty-state">请先登录或输入手机号查询订单</div>');
      return;
    }

    req
      .then(function (data) {
        state.lastList = data.list || [];
        renderList(state.lastList);
      })
      .catch(function (err) {
        if (err && err.code === 401) {
          localStorage.removeItem('authToken');
          state.token = '';
          guestCard.removeClass('d-none');
          orderList.empty();
          orderList.append('<div class="empty-state">登录已过期，请重新登录或手机号查询</div>');
          return;
        }
        orderList.empty();
        orderList.append('<div class="empty-state">加载失败</div>');
        app.showError(err && err.message ? err.message : '加载失败');
      });
  }

  function initMode() {
    if (state.token) {
      guestCard.addClass('d-none');
      return;
    }
    guestCard.removeClass('d-none');
  }

  $('#guestQueryBtn').on('click', function () {
    var phone = $('#guestPhone').val();
    var phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      app.showError('请输入正确的手机号');
      return;
    }
    state.buyerPhone = phone;
    loadOrders();
  });

  $('#guestPhone').on('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      $('#guestQueryBtn').trigger('click');
    }
  });

  $('#refreshBtn').on('click', function () {
    loadOrders();
  });

  statusFilter.on('change', function () {
    renderList(state.lastList);
  });
  payStatusFilter.on('change', function () {
    renderList(state.lastList);
  });

  orderList.on('click', '.order-item', function (e) {
    if ($(e.target).closest('.order-actions').length) return;
    var href = $(this).data('href');
    if (href) window.location.href = href;
  });

  orderList.on('click', '.js-cancel', function (e) {
    e.preventDefault();
    e.stopPropagation();
    var orderId = $(this).data('id');
    if (!orderId) return;

    if (window.Swal) {
      window.Swal.fire({
        title: '确认取消订单？',
        text: '取消后可重新下单购买。',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '取消订单',
        cancelButtonText: '再想想',
      }).then(function (result) {
        if (result.isConfirmed) cancelOrder(orderId);
      });
      return;
    }

    if (confirm('确认取消订单？')) cancelOrder(orderId);
  });

  initMode();
  loadOrders();
});
