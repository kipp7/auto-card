$(document).ready(function () {
  var productList = $('#product-list');
  var categoryList = $('#categoryList');

  var state = {
    category: '',
    keyword: '',
    isRealName: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  var categories = [
    { label: '全部', value: '' },
    { label: '热门卡密', value: 'xiaohongshuo' },
    { label: '账号卡密', value: 'mouyin' },
    { label: '会员权益', value: 'moushou' },
    { label: '激活码', value: 'moushipinhao' },
    { label: '充值卡', value: 'moubaijiahao' },
  ];

  function renderCategories() {
    categoryList.empty();
    categories.forEach(function (item) {
      var active = item.value === state.category ? 'active' : '';
      var btn = $(
        '<button type="button" class="category-item ' +
          active +
          '" data-value="' +
          item.value +
          '">' +
          item.label +
          '</button>',
      );
      categoryList.append(btn);
    });
  }

  function genderTag(maleRatio, femaleRatio) {
    var male = Number(maleRatio) || 0;
    var female = Number(femaleRatio) || 0;
    if (male >= female) {
      return '<span class="gender-tag male"><i class="bi bi-gender-male"></i> 男用户多</span>';
    }
    return '<span class="gender-tag female"><i class="bi bi-gender-female"></i> 女用户多</span>';
  }

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

  function renderProducts(productsToRender) {
    productList.empty();
    if (!productsToRender || !productsToRender.length) {
      productList.append('<div class="col-12"><div class="empty-state">暂无卡密</div></div>');
      return;
    }

    productsToRender.forEach(function (product, index) {
      var image = product.mainImage || 'https://via.placeholder.com/600x600.png?text=Product';
      var tag = genderTag(product.maleRatio, product.femaleRatio);
      var realNameBadge = product.isRealName
        ? '<span class="badge text-bg-success ms-2">已实名</span>'
        : '<span class="badge text-bg-secondary ms-2">未实名</span>';
      var stockAvailable = Number(product.stockAvailable) || 0;
      var soldOut = product.isSoldOut || stockAvailable <= 0;
      var lowStock = !soldOut && stockAvailable > 0 && stockAvailable <= 3;
      var stockFlagClass = soldOut ? 'stock-flag sold-out' : lowStock ? 'stock-flag low' : 'stock-flag';
      var stockFlag = soldOut
        ? '<span class="' + stockFlagClass + '">已售罄</span>'
        : '<span class="' + stockFlagClass + '">库存 ' + stockAvailable + '</span>';
      var pricing = getPricing(product);
      var priceHtml =
        '<div class="card-price-stack mt-2">' +
        '<span class="card-price">￥' +
        formatPrice(pricing.sale) +
        '</span>' +
        (pricing.original ? '<span class="card-price-original">￥' + formatPrice(pricing.original) + '</span>' : '') +
        (pricing.promoActive ? '<span class="promo-badge">促销中</span>' : '') +
        '</div>';

      var delay = Math.min(index * 60, 480);
      var card = `
        <div class="col">
          <a class="text-decoration-none" href="product-detail.html?id=${product.id}">
            <div class="card product-card h-100 ${soldOut ? 'is-sold-out' : ''}" style="animation-delay:${delay}ms">
              <img src="${image}" class="card-img-top" alt="${product.name}">
              ${tag}
              ${stockFlag}
              <div class="card-body d-flex flex-column">
                <h5 class="card-title">
                  ${product.name}
                  ${realNameBadge}
                </h5>
                <div class="mt-auto">
                  <div class="card-info">
                    <span><i class="bi bi-person-hearts"></i> 成交: ${product.followers}</span>
                    <span><i class="bi bi-hand-thumbs-up-fill"></i> 收藏: ${product.likes}</span>
                  </div>
                    ${priceHtml}
                  <div class="btn ${soldOut ? 'btn-outline-secondary' : 'btn-dark'} w-100">
                    ${soldOut ? '已售罄' : '查看详情'}
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>
      `;
      productList.append(card);
    });
  }

  function loadAnnouncement() {
    http
      .get('/api/c/announcements', { page: 1, pageSize: 1 })
      .then(function (data) {
        var first = data.list && data.list.length ? data.list[0] : null;
        $('.announcement-text').text(first ? first.title : '暂无公告');
      })
      .catch(function () {
        $('.announcement-text').text('暂无公告');
      });
  }

  function loadProducts() {
    productList.empty();
    productList.append('<div class="col-12"><div class="empty-state">加载中...</div></div>');

    http
      .get('/api/c/products', {
        page: 1,
        pageSize: 20,
        keyword: state.keyword,
        category: state.category,
        isRealName: state.isRealName,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      })
      .then(function (data) {
        renderProducts(data.list);
      })
      .catch(function (err) {
        productList.empty();
        productList.append('<div class="col-12"><div class="empty-state">加载失败</div></div>');
        app.showError(err && err.message ? err.message : '加载失败');
      });
  }

  function bindEvents() {
    categoryList.on('click', '.category-item', function () {
      state.category = $(this).data('value');
      renderCategories();
      loadProducts();
    });

    $('#searchBtn').on('click', function () {
      state.keyword = $('#keyword').val() || '';
      state.sortBy = $('#sortBy').val();
      state.sortOrder = $('#sortOrder').val();
      state.isRealName = $('#realName').val();
      loadProducts();
    });

    $('#keyword').on('keydown', function (e) {
      if (e.key === 'Enter') $('#searchBtn').trigger('click');
    });
  }

  renderCategories();
  bindEvents();
  loadAnnouncement();
  loadProducts();
});


