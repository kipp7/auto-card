技术要点
- 实现用户端对接后端API
- 实现后台管理系统首页的数据概览
提示词相关
（用户端对接后端的时候第一次使用的提示词）
## 任务
- 主要功能是对接docs目录下的c-api文档
- 需要严格按照docs目录下的c-api接口进行对接，包括请求参数以及返回字段
- 不要修改任何的布局和样式，先把接口对接好就行，不能遗漏任何一个接口
- 然后你需要再把每一个api接口集成到现有的页面模块中
- 要保证每一个模块的列表/按钮/等都是正常和按钮对接上，要保证每一个列表字段和文档一致
- 需要把我们静态数据换成我们接口返回的数据
- 由于项目功能需求较大  你可以分步骤来进行开发可以定一个todos，注意不要简化任何操作
- 测试接口服务器是http://localhost:3000
（其他的一些没整理的 看看就行了）
/api/c/orders authorization
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwidXNlcm5hbWUiOiJjZXNoaTEyMyIsInR5cGUiOiJtb2JpbGUiLCJpYXQiOjE3NjM0NjQxODMsImV4cCI6MTc2MzU1MDU4M30.wA3dU4f-pqSiF_49nnk_SZvTklmsNiHQY5fV1U15tb0 {
    "code": 0,
    "message": "订单创建成功",
    "data": {
        "orderId": 6,
        "orderNo": "ORD1763464220552ukksc6snw",
        "productName": "3333",
        "orderAmount": "43.00",
        "status": "pending"
    }
} {"productId":4,"buyerPhone":"13113111311","paymentMethod":"wechat"}  http://localhost:3000/api/c/orders?page=1&pageSize=20
authorization
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwidXNlcm5hbWUiOiJjZXNoaTEyMyIsInR5cGUiOiJtb2JpbGUiLCJpYXQiOjE3NjM0NjQxODMsImV4cCI6MTc2MzU1MDU4M30.wA3dU4f-pqSiF_49nnk_SZvTklmsNiHQY5fV1U15tb0
{
    "code": 0,
    "message": "success",
    "data": {
        "list": [],
        "total": 0,
        "page": 1,
        "pageSize": 20
    }
}