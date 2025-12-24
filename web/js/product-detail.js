$(document).ready(function () {
  var productId = app.getQueryParam('id');
  if (!productId) {
    app.showError('缺少卡密ID');
    return;
  }

  var previewModal = new bootstrap.Modal(document.getElementById('imagePreviewModal'));
  var isSoldOut = false;

  function formatPrice(value) {
    var n = Number(value);
    if (Number.isNaN(n)) return String(value || '');
    return n.toFixed(2);
  }

  function getPricing(product) {
    var sale = Number(product.salePrice || product.price || 0);
    var base = Number(product.price || 0);
    var original = null;
    if (product.promoActive && !Number.isNaN(sale) && !Number.isNaN(base) && sale < base) {
      original = base;
    } else if (product.originalPrice && Number(product.originalPrice) > base) {
      original = Number(product.originalPrice);
    }
    return {
      sale: sale,
      original: original,
      promoActive: !!product.promoActive,
    };
  }

  function addThumb(src) {
    if (!src) return;
    var item = $(
      '<div class="thumb-item" role="button" tabindex="0"><img alt="thumb" src="' + src + '"></div>',
    );
    item.on('click', function () {
      $('#previewImage').attr('src', src);
      previewModal.show();
    });
    $('#thumbList').append(item);
  }

  function renderProduct(product) {
    var mainImage = product.mainImage || 'https://via.placeholder.com/600x600.png?text=Product';
    $('#mainImage').attr('src', mainImage);
    $('#productName').text(product.name || '-');
    var pricing = getPricing(product);
    $('#productPrice').text('￥' + formatPrice(pricing.sale));
    if (pricing.original) {
      $('#productOriginalPrice').text('￥' + formatPrice(pricing.original));
    } else {
      $('#productOriginalPrice').text('');
    }
    $('#promoBadge').toggleClass('d-none', !pricing.promoActive);

    $('#followers').text(product.followers || 0);
    $('#likes').text(product.likes || 0);

    var stockAvailable = Number(product.stockAvailable) || 0;
    var stockTotal = Number(product.stockTotal) || 0;
    isSoldOut = product.isSoldOut || stockAvailable <= 0;
    var lowStock = !isSoldOut && stockAvailable > 0 && stockAvailable <= 3;
    $('#stockAvailable').text(stockAvailable);
    $('#stockTotal').text(stockTotal || stockAvailable);
    $('#stockBadge')
      .toggleClass('d-none', !isSoldOut && !lowStock)
      .toggleClass('text-bg-warning', lowStock)
      .toggleClass('text-bg-secondary', !lowStock)
      .text(isSoldOut ? '已售罄' : lowStock ? '库存紧张' : '库存充足');
    if (isSoldOut) {
      $('#orderForm button[type="submit"]').prop('disabled', true).addClass('disabled');
      $('#soldOutTip').removeClass('d-none');
    } else {
      $('#orderForm button[type="submit"]').prop('disabled', false).removeClass('disabled');
      $('#soldOutTip').addClass('d-none');
    }

    $('#realNameBadge')
      .toggleClass('text-bg-success', !!product.isRealName)
      .toggleClass('text-bg-secondary', !product.isRealName)
      .text(product.isRealName ? '已实名' : '未实名');

    $('#description').text(product.description || '-');
    $('#detailedIntro').html(product.detailedIntro || '<span class="text-muted">-</span>');
    $('#usageInstructions').html(product.usageInstructions || '<span class="text-muted">-</span>');

    $('#thumbList').empty();
    addThumb(product.mainImage);
    addThumb(product.screenshot);
    (product.galleryImages || []).forEach(function (img) {
      addThumb(img);
    });
  }

  function renderRelated(list) {
    var wrap = $('#relatedList');
    wrap.empty();
    if (!list || !list.length) {
      wrap.append('<div class="col-12"><div class="empty-state">暂无相关卡密</div></div>');
      return;
    }

    list.slice(0, 8).forEach(function (p) {
      var image = p.mainImage || 'https://via.placeholder.com/600x600.png?text=Product';
      var card = `
        <div class="col">
          <a class="text-decoration-none" href="product-detail.html?id=${p.id}">
            <div class="card product-card h-100">
              <img src="${image}" class="card-img-top" alt="${p.name}">
              <div class="card-body">
                <div class="card-title mb-0">${p.name}</div>
              </div>
            </div>
          </a>
        </div>
      `;
      wrap.append(card);
    });
  }

  function loadRelated(product) {
    http
      .get('/api/c/products', { page: 1, pageSize: 20, category: product.category, sortBy: 'createdAt', sortOrder: 'desc' })
      .then(function (data) {
        var list = (data.list || []).filter(function (p) {
          return String(p.id) !== String(product.id);
        });
        renderRelated(list);
      })
      .catch(function () {
        renderRelated([]);
      });
  }

  function loadProduct() {
    http
      .get('/api/c/products/' + encodeURIComponent(productId))
      .then(function (product) {
        renderProduct(product);
        loadRelated(product);
      })
      .catch(function (err) {
        app.showError(err && err.message ? err.message : '加载失败');
      });
  }

  $('#orderForm').on('submit', function (e) {
    e.preventDefault();
    if (isSoldOut) {
      app.showError('库存不足，暂时无法下单');
      return;
    }
    var buyerPhone = $('#buyerPhone').val();
    var paymentMethod = $('input[name="paymentMethod"]:checked').val();
    var phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(buyerPhone)) {
      app.showError('请输入正确的手机号');
      return;
    }

    http
      .post('/api/c/orders', { productId: Number(productId), buyerPhone: buyerPhone, paymentMethod: paymentMethod })
      .then(function (order) {
        window.location.href =
          'pay.html?orderId=' +
          encodeURIComponent(order.orderId) +
          '&buyerPhone=' +
          encodeURIComponent(buyerPhone);
      })
      .catch(function (err) {
        app.showError(err && err.message ? err.message : '下单失败');
      });
  });

  loadProduct();
});

