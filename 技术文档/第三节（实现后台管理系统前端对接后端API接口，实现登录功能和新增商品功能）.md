技术要点
- 实现后台管理系统对接后端API接口
- 实现后台管理系统登录功能
- 实现后台管理系统新增商品功能
- 实现后台管理系统所有列表查询功能
- 实现后台管理系统文件上传功能
提示词相关
（后台管理平台对接后端的时候第一次使用的提示词）
- 根据当前项目代码风格进行二次开发
- 主要功能是对接docs目录下的b-api文档
- 目前已经对接好了登录功能
- 现在还需要对接其他模块的接口
- 需要严格按照docs目录下的b-api接口进行对接，包括请求参数以及返回字段
- 不要修改任何的布局和样式，先把接口对接好就行，不能遗漏任何一个接口
- 然后你需要再把每一个api接口集成到现有的页面模块中
- 要保证每一个模块的新增、编辑、删除、筛选、导入、导出都是正常和按钮对接上，要保证每一个列表字段和文档一致
- 需要把我们静态数据换成我们接口返回的数据，可以参考登录接口是如何对接的
- 由于项目功能需求较大  你可以分步骤来进行开发可以定一个todos，注意不要简化任何操作
- 测试接口服务器是http://localhost:3000 .env .env.development都需要修改一下
- 由于项目功能需求较大  你可以分步骤来进行开发可以定一个todos，注意不要简化任何操作

（后端API接口开发提示词）
- 需要根据当前代码风格进行二次开发，有重复组件就用重复组件，不要使用任何emoji图标
- 合理的使用utils下面封装好的工具类
- 需要初始化数据库，数据表设计可以看根目录下面的docs目录下的数据表设计，严格按照这个来进行设计
- 结合initDB和initDbData这两个初始化的文件，数据库已经建好了 只要建立数据表就可以了
- 所有的请求字段和响应字段返回必须为驼峰命名
- 所有的表和字段都需要加上中文注释
- 密码类的加密方式使用md5就可以了
- 所有的字段都需要严格的按照docs目录下的表设计进行设计
- 所有的接口都需要严格的按照docs目录下的api接口设计
- 不要有任何自己的假象和虚构 按照文档提供的来进行开发
- 需要实现完整的代码和接口功能，不要遗漏任何一个接口
- 写完一个模块需要在docs下面创建接口文档 c端的就放到c-api文件夹 b端的就放到b-api文件夹，命名方式为xxxapi文档.md
- 需要在.env和config里面配置数据库信息以及七牛云信息等，默认信息也需要一并修改

## 开发规范

- 遵循当前项目的 Vue 3 + TypeScript + Element Plus 技术栈
- 所有 API 调用必须严格按照 [docs/b-api/]目录下的文档规范
- 使用 `/api/b/` 前缀调用 B 端管理接口（测试服务器：http://localhost:3000）
- 参考登录接口（[src/api/auth.ts]的实现方式对接其他模块
- 请求参数和返回字段必须与文档完全一致，不能遗漏任何字段
- 使用项目已有的组件库（ArtTable、ArtTableHeader、ArtSearchBar 等）
- 保持现有的页面布局和样式不变
- 不使用 emoji 图标
- 所有列表字段必须与文档字段保持一致
- 使用 TypeScript 进行类型定义，确保类型安全
- 保持现有的页面布局和样式不变
## 任务

### 第一阶段：API 接口层对接

1. **更新 API 类型定义**
   - 在 [src/types/api/] 中为每个模块定义完整的请求参数和响应类型
   - 参考文档中的请求示例和响应示例定义类型

2. **完成 API 函数实现**
   - 在 [src/api/business.ts]中补充完整的 API 调用函数
   - 对接以下模块的所有接口：
     - 用户管理（`/api/b/users`）：列表、详情、编辑、禁用/启用、删除
     - 商品管理（`/api/b/products`）：列表、详情、创建、编辑、上架/下架、删除
     - 订单管理（`/api/b/orders`）：列表、详情、修改状态、手动发放、取消、删除、导出
     - 公告管理（`/api/b/announcements`）：列表、创建、编辑、删除
     - 财务管理（`/api/b/finance/sales-statistics`）：销售统计
     - 仪表板（`/api/b/dashboard/overview`）：数据概览

### 第二阶段：页面模块集成

3. **用户管理模块** (`src/views/system/user/`)
   - 集成用户列表 API（搜索、分页、排序）
   - 实现编辑用户信息功能
   - 实现禁用/启用用户功能
   - 实现删除用户功能
   - 确保所有按钮和功能都正常对接

4. **商品管理模块** (`src/views/product/list/`)
   - 集成商品列表 API（搜索、分页、排序）
   - 实现新增商品功能
   - 实现编辑商品功能
   - 实现上架/下架商品功能
   - 实现删除商品功能

5. **订单管理模块** (`src/views/order/list/`)
   - 集成订单列表 API（搜索、分页、排序）
   - 实现修改订单状态功能
   - 实现手动发放账号功能
   - 实现取消订单功能
   - 实现删除订单功能
   - 实现订单导出功能

6. **公告管理模块** (`src/views/announcement/`)
   - 集成公告列表 API（搜索、分页、排序）
   - 实现新增公告功能
   - 实现编辑公告功能
   - 实现删除公告功能

7. **财务管理模块** (`src/views/finance/sales-statistics/`)
   - 集成销售统计 API
   - 实现数据筛选和导出功能

8. **仪表板模块** (`src/views/dashboard/overview/`)
   - 集成数据概览 API
   - 显示关键指标数据

## 注意事项

- 每个模块必须实现：列表查询、新增、编辑、删除、搜索、分页、排序、导出（如适用）
- 所有列表字段必须与 API 文档中的字段完全一致
- 请求参数名称必须与文档中的参数名称一致（如 `pageSize` 而非 `page_size`）
- 所有 API 调用都需要在请求头中包含 `Authorization: Bearer {token}`
- 错误处理要完善，参考登录页面的错误处理方式
- 测试时确保所有功能都能正常工作，数据能正确显示和更新
- 每个模块的按钮都要对接上对应的 API 接口

---
现在请立即开始按照上述规范和任务进行开发。
（其他的一些没整理的 看看就行了）
检查一下是否有七牛云上传图片的功能，现在B端需要一个七牛云上传图片的接口 用于上传商品图片和账号截图，然后所有的接口响应返回给前端都需要yyyy-mmmm-dddd hh-mm-ss 的格式 


检查一下每个模块新增/编辑/删除/筛选/上下架这些按钮是否都已经对接好了我们的 接口



/api/b/products {"name":"32222","category":"xiaohongshuo","price":33,"originalPrice":333,"followers":3231,"likes":321,"isRealName":true,"cardNumber":"1----2----33","status":"online","description":"321321","mainImage":"http://t5wpwj0gr.hn-bkt.clouddn.com/products/1763458960932_flz0n9.jpg","screenshot":"http://t5wpwj0gr.hn-bkt.clouddn.com/products/1763458968008_4ttkyq.jpg","detailedIntro":"321321","usageInstructions":"<p>321312111</p>"} {"code":500,"message":"创建商品失败","data":null} 2025-11-18 17:42:53 error: SQL执行错误: Bind parameters must not contain undefined. To pass 
SQL NULL specify JS null
Error: Bind parameters must not contain undefined. To pass SQL NULL specify JS null
    at PromisePool.execute (G:\daima\code\教程\xiaohongshuzhanghao\server\node_modules\mysql2\lib\promise\pool.js:54:22)
    at query (G:\daima\code\教程\xiaohongshuzhanghao\server\utils\db.js:33:31)
    at G:\daima\code\教程\xiaohongshuzhanghao\server\routes\b\products.js:178:26
    at Layer.handle [as handle_request] (G:\daima\code\教程\xiaohongshuzhanghao\server\node_modules\express\lib\router\layer.js:95:5)
    at next (G:\daima\code\教程\xiaohongshuzhanghao\server\node_modules\express\lib\router\route.js:149:13)
    at G:\daima\code\教程\xiaohongshuzhanghao\server\utils\jwt.js:84:5
    at Layer.handle [as handle_request] (G:\daima\code\教程\xiaohongshuzhanghao\server\node_modules\express\lib\router\layer.js:95:5)
    at next (G:\daima\code\教程\xiaohongshuzhanghao\server\node_modules\express\lib\router\route.js:149:13)
    at Route.dispatch (G:\daima\code\教程\xiaohongshuzhanghao\server\node_modules\express\lib\router\route.js:119:3)
    at Layer.handle [as handle_request] (G:\daima\code\教程\xiaohongshuzhanghao\server\node_modules\express\lib\router\layer.js:95:5) {
  code: undefined,
  errno: undefined,
  sql: undefined,
  sqlState: undefined,
  sqlMessage: undefined
}
2025-11-18 17:42:53 info: POST /api/b/products 500 11.282 ms - 55
