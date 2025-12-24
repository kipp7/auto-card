import { createRouter, createWebHistory } from 'vue-router';

import Layout from '../views/Layout.vue';
import Login from '../views/Login.vue';
import Dashboard from '../views/Dashboard.vue';
import Products from '../views/Products.vue';
import Orders from '../views/Orders.vue';
import Announcements from '../views/Announcements.vue';
import Users from '../views/Users.vue';
import Finance from '../views/Finance.vue';

function getToken(): string {
  return localStorage.getItem('adminToken') || '';
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', component: Login, meta: { requiresAuth: false } },
    {
      path: '/',
      component: Layout,
      meta: { requiresAuth: true },
      redirect: '/dashboard',
      children: [
        { path: '/dashboard', component: Dashboard },
        { path: '/products', component: Products },
        { path: '/orders', component: Orders },
        { path: '/announcements', component: Announcements },
        { path: '/users', component: Users },
        { path: '/finance', component: Finance },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const token = getToken();
  if (to.path === '/login') {
    if (token) return { path: '/dashboard' };
    return true;
  }

  if (to.meta.requiresAuth && !token) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  return true;
});

export default router;

