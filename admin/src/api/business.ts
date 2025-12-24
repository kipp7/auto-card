import http from './http';

export type PageResult<T> = {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type DashboardOverview = {
  productTotal: number;
  orderTotal: number;
  paidOrderTotal: number;
  todayOrderTotal: number;
  todaySalesAmount: string;
  totalSalesAmount: string;
  conversionRate: string;
  refundRate: string;
  reconcileCount: number;
  reconcileCheckedAt: string | null;
};

export function getDashboardOverview(): Promise<DashboardOverview> {
  return http.get('/api/b/dashboard/overview');
}

export type Product = {
  id: number;
  name: string;
  category: string;
  price: string;
  originalPrice: string | null;
  promoPrice?: string | null;
  promoStartAt?: string | null;
  promoEndAt?: string | null;
  promoActive?: boolean;
  followers: number;
  likes: number;
  isRealName: boolean;
  mainImage: string | null;
  screenshot: string | null;
  stockAvailable?: number;
  stockReserved?: number;
  stockSold?: number;
  stockTotal?: number;
  status: 'online' | 'offline';
  createdAt: string;
  updatedAt?: string;
};

export type ProductDetail = Product & {
  cardNumber: string | null;
  description: string | null;
  detailedIntro: string | null;
  usageInstructions: string | null;
  galleryImages: string[];
};

export type ProductPayload = {
  name: string;
  category: string;
  price: number | string;
  originalPrice?: number | string | null;
  promoPrice?: number | string | null;
  promoStartAt?: string | null;
  promoEndAt?: string | null;
  followers?: number;
  likes?: number;
  isRealName?: boolean;
  cardNumber?: string | null;
  description?: string | null;
  detailedIntro?: string | null;
  usageInstructions?: string | null;
  mainImage?: string | null;
  screenshot?: string | null;
  galleryImages?: string[] | null;
  status?: 'online' | 'offline';
};

export function listProducts(params: Record<string, any>): Promise<PageResult<Product>> {
  return http.get('/api/b/products', { params });
}

export function getProduct(id: number): Promise<ProductDetail> {
  return http.get(`/api/b/products/${id}`);
}

export function createProduct(payload: ProductPayload): Promise<{ id: number }> {
  return http.post('/api/b/products', payload);
}

export function updateProduct(id: number, payload: Partial<ProductPayload>): Promise<null> {
  return http.put(`/api/b/products/${id}`, payload);
}

export function patchProductStatus(id: number, status: 'online' | 'offline'): Promise<null> {
  return http.patch(`/api/b/products/${id}/status`, { status });
}

export function deleteProduct(id: number): Promise<null> {
  return http.delete(`/api/b/products/${id}`);
}

export type ProductStockSummary = {
  stockAvailable: number;
  stockReserved: number;
  stockSold: number;
  stockTotal: number;
};

export type ProductStockItem = {
  id: number;
  cardNumber: string;
  status: 'available' | 'reserved' | 'sold';
  reservedOrderId: number | null;
  soldOrderId: number | null;
  reservedAt: string | null;
  soldAt: string | null;
  createdAt: string;
};

export function getProductStock(id: number, params: Record<string, any>): Promise<PageResult<ProductStockItem>> {
  return http.get(`/api/b/products/${id}/stock`, { params });
}

export function importProductStock(
  id: number,
  payload: { cards?: string[]; cardsText?: string; text?: string; cardNumber?: string },
): Promise<ProductStockImportResult> {
  return http.post(`/api/b/products/${id}/stock/import`, payload);
}

export type ProductStockImportResult = {
  attempted: number;
  inserted: number;
  skipped: number;
  summary: {
    invalid: number;
    duplicate: number;
    existed: number;
    overLimit: number;
  };
  errors: Array<{
    cardNumber: string;
    reason: string;
  }>;
  stock: ProductStockSummary;
};

export function deleteProductStock(id: number, cardId: number): Promise<null> {
  return http.delete(`/api/b/products/${id}/stock/${cardId}`);
}

export type Order = {
  orderId: number;
  orderNo: string;
  productId: number;
  productName: string;
  orderAmount: string;
  originalAmount?: string | null;
  discountAmount?: string | null;
  buyerPhone: string;
  paymentMethod: 'wechat' | 'alipay' | 'qq';
  status: string;
  payStatus: 'paid' | 'unpaid';
  refundStatus?: 'none' | 'pending' | 'refunded' | 'failed';
  paymentTradeNo?: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type OrderDetail = Order & {
  userId: number | null;
  cardNumber: string | null;
  refundAmount?: string | null;
  refundReason?: string | null;
  refundedAt?: string | null;
  deliveredAt: string | null;
  updatedAt: string;
};

export function listOrders(params: Record<string, any>): Promise<PageResult<Order>> {
  return http.get('/api/b/orders', { params });
}

export function exportOrders(params: Record<string, any>): Promise<Blob> {
  return http.get('/api/b/orders/export', { params, responseType: 'blob' });
}

export type BatchDeliverItem = {
  orderId: number;
  cardNumber?: string;
};

export type BatchDeliverResult = {
  total: number;
  success: number;
  failed: number;
  results: Array<{
    orderId: number | string;
    ok: boolean;
    message: string;
    cardNumber?: string | null;
    status?: number;
  }>;
};

export function batchDeliverOrders(payload: { items?: BatchDeliverItem[]; orderIds?: number[] }): Promise<BatchDeliverResult> {
  return http.post('/api/b/orders/batch-deliver', payload);
}

export type ReconcileItem = {
  orderId: number;
  orderNo: string;
  productName: string;
  payStatus: string;
  status: string;
  cardId: number | null;
  cardNumber: string | null;
  cardStatus: string | null;
  soldOrderId: number | null;
  paidAt: string | null;
  createdAt: string;
};

export function getOrderReconcile(params: Record<string, any>): Promise<PageResult<ReconcileItem>> {
  return http.get('/api/b/orders/reconcile', { params });
}

export function getOrder(id: number): Promise<OrderDetail> {
  return http.get(`/api/b/orders/${id}`);
}

export function patchOrderStatus(id: number, status: string): Promise<null> {
  return http.patch(`/api/b/orders/${id}/status`, { status });
}

export function deliverOrder(id: number, cardNumber: string): Promise<null> {
  return http.post(`/api/b/orders/${id}/deliver`, { cardNumber });
}

export function repairOrder(id: number): Promise<{ cardNumber: string | null }> {
  return http.post(`/api/b/orders/${id}/repair`);
}

export function refundOrder(id: number, payload: { amount?: number; reason?: string }): Promise<null> {
  return http.post(`/api/b/orders/${id}/refund`, payload);
}

export function deleteOrder(id: number): Promise<null> {
  return http.delete(`/api/b/orders/${id}`);
}

export type Announcement = {
  id: number;
  title: string;
  content: string;
  status: 'published' | 'draft';
  sort: number;
  createdAt: string;
  updatedAt: string;
};

export type AnnouncementPayload = {
  title: string;
  content: string;
  status?: 'published' | 'draft';
  sort?: number;
};

export function listAnnouncements(params: Record<string, any>): Promise<PageResult<Announcement>> {
  return http.get('/api/b/announcements', { params });
}

export function createAnnouncement(payload: AnnouncementPayload): Promise<{ id: number }> {
  return http.post('/api/b/announcements', payload);
}

export function updateAnnouncement(id: number, payload: Partial<AnnouncementPayload>): Promise<null> {
  return http.put(`/api/b/announcements/${id}`, payload);
}

export function deleteAnnouncement(id: number): Promise<null> {
  return http.delete(`/api/b/announcements/${id}`);
}

export type User = {
  id: number;
  username: string;
  type: 'admin' | 'mobile';
  status: 'enabled' | 'disabled';
  createdAt: string;
};

export function listUsers(params: Record<string, any>): Promise<PageResult<User>> {
  return http.get('/api/b/users', { params });
}

export function patchUserStatus(id: number, status: 'enabled' | 'disabled'): Promise<null> {
  return http.patch(`/api/b/users/${id}/status`, { status });
}

export function deleteUser(id: number): Promise<null> {
  return http.delete(`/api/b/users/${id}`);
}

export type SalesStatistics = {
  totalOrders: number;
  paidOrders: number;
  totalSalesAmount: string;
  refundedOrders: number;
  totalRefundAmount: string;
  conversionRate: string;
  refundRate: string;
};

export function getSalesStatistics(params: { startDate?: string; endDate?: string }): Promise<SalesStatistics> {
  return http.get('/api/b/finance/sales-statistics', { params });
}

export type FullReductionRule = {
  enabled: boolean;
  threshold: number;
  reduce: number;
};

export function getFullReductionRule(): Promise<FullReductionRule> {
  return http.get('/api/b/finance/full-reduction');
}

export function updateFullReductionRule(payload: FullReductionRule): Promise<FullReductionRule> {
  return http.put('/api/b/finance/full-reduction', payload);
}
