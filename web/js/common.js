(function () {
  function getQueryParam(key) {
    var params = new URLSearchParams(window.location.search);
    return params.get(key);
  }

  function setActiveNav() {
    var page = document.body.getAttribute('data-page');
    if (!page) return;
    $('.bottom-nav-link').removeClass('active');
    $('.bottom-nav-link[data-page="' + page + '"]').addClass('active');
  }

  function formatOrderStatus(status, payStatus, refundStatus) {
    if (refundStatus === 'refunded') return { text: '已退款', className: 'bg-secondary' };
    if (payStatus === 'paid') return { text: '已完成', className: 'bg-success' };
    if (status === 'cancelled') return { text: '已取消', className: 'bg-secondary' };
    return { text: '待支付', className: 'bg-warning text-dark' };
  }

  function showError(message) {
    if (window.Swal) {
      window.Swal.fire({ title: '提示', text: message || '操作失败', icon: 'error' });
      return;
    }
    alert(message || '操作失败');
  }

  function showSuccess(message) {
    if (window.Swal) {
      window.Swal.fire({ title: '成功', text: message || '操作成功', icon: 'success' });
      return;
    }
    alert(message || '操作成功');
  }

  window.app = {
    getQueryParam: getQueryParam,
    setActiveNav: setActiveNav,
    formatOrderStatus: formatOrderStatus,
    showError: showError,
    showSuccess: showSuccess,
  };

  $(document).ready(function () {
    setActiveNav();
  });
})();
