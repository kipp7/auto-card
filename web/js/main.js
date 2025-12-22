$(document).ready(function() {
    // 静态商品数据 (用于演示)
    const products = [
        {
            id: 1,
            name: '小红薯1号 - 美妆博主',
            price: 99.9,
            image: 'https://via.placeholder.com/300x300.png?text=商品1',
            followers: '1.2w',
            likes: '5.8w',
            genderRatio: 'female', // 'male' or 'female'
        },
        {
            id: 2,
            name: '小红薯2号 - 健身达人',
            price: 88.0,
            image: 'https://via.placeholder.com/300x300.png?text=商品2',
            followers: '8k',
            likes: '2.1w',
            genderRatio: 'male',
        },
        {
            id: 3,
            name: '小红薯3号 - 美食探店',
            price: 128.0,
            image: 'https://via.placeholder.com/300x300.png?text=商品3',
            followers: '3.5w',
            likes: '10.2w',
            genderRatio: 'female',
        },
        {
            id: 4,
            name: '小红薯4号 - 旅行博主',
            price: 150.0,
            image: 'https://via.placeholder.com/300x300.png?text=商品4',
            followers: '5.1w',
            likes: '15.6w',
            genderRatio: 'female',
        },
        {
            id: 5,
            name: '小红薯5号 - 游戏主播',
            price: 75.5,
            image: 'https://via.placeholder.com/300x300.png?text=商品5',
            followers: '2.2w',
            likes: '8.8w',
            genderRatio: 'male',
        },
        {
            id: 6,
            name: '小红薯6号 - 穿搭分享',
            price: 110.0,
            image: 'https://via.placeholder.com/300x300.png?text=商品6',
            followers: '4.3w',
            likes: '12.1w',
            genderRatio: 'female',
        },
        {
            id: 7,
            name: '小红薯7号 - 知识科普',
            price: 200.0,
            image: 'https://via.placeholder.com/300x300.png?text=商品7',
            followers: '10.5w',
            likes: '30.2w',
            genderRatio: 'male',
        },
        {
            id: 8,
            name: '小红薯8号 - 宠物日常',
            price: 95.0,
            image: 'https://via.placeholder.com/300x300.png?text=商品8',
            followers: '6.7w',
            likes: '22.5w',
            genderRatio: 'female',
        },
        {
            id: 9,
            name: '小红薯9号 - 摄影教程',
            price: 180.0,
            image: 'https://via.placeholder.com/300x300.png?text=商品9',
            followers: '8.2w',
            likes: '25.1w',
            genderRatio: 'male',
        },
        {
            id: 10,
            name: '小红薯10号 - 手工DIY',
            price: 68.0,
            image: 'https://via.placeholder.com/300x300.png?text=商品10',
            followers: '1.9w',
            likes: '4.5w',
            genderRatio: 'female',
        },
    ];

    const productList = $('#product-list');

    // 渲染商品卡片
    function renderProducts(productsToRender) {
        productList.empty(); // 清空现有内容
        productsToRender.forEach(product => {
            const genderTag = product.genderRatio === 'male' 
                ? '<span class="gender-tag male"><i class="bi bi-gender-male"></i> 男粉多</span>' 
                : '<span class="gender-tag female"><i class="bi bi-gender-female"></i> 女粉多</span>';

            const productCard = `
                <div class="col">
                    <div class="card product-card h-100">
                        <img src="${product.image}" class="card-img-top" alt="${product.name}">
                        ${genderTag}
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${product.name}</h5>
                            <div class="mt-auto">
                                <div class="card-info">
                                    <span><i class="bi bi-person-hearts"></i> 粉丝: ${product.followers}</span>
                                    <span><i class="bi bi-hand-thumbs-up-fill"></i> 赞藏: ${product.likes}</span>
                                </div>
                                <p class="card-price mt-2">¥${product.price.toFixed(2)}</p>
                                <a href="#" class="btn btn-dark w-100">立即购买</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            productList.append(productCard);
        });
    }

    // 初始加载
    renderProducts(products);
});