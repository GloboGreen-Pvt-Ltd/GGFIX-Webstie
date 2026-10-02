/**
 * sellFlow.js — read-only master-data lookups behind the partner dashboard's
 * Sell a Device flow (category → brand → model), reusing the exact
 * category/brand/model relationship Book Service uses:
 *
 *   GET /master/device-categories                 — categories (code, name, imageUrl)
 *   GET /master/categories/by-code/{CODE}/brands  — brands in that category (name, imageUrl logo)
 *   GET /master/brands/{brandId}/models           — a brand's models across ALL categories,
 *                                                   narrowed here by model.categoryId
 *
 * For selling, models flagged `sellActive: false` are left out — that flag is
 * master data's own "can be sold" switch (see /management/models).
 */

import { masterApi } from '@/lib/api';
import { DEVICE_CATEGORIES, sortDeviceCategories } from '@/lib/siteContent';

const unwrap = (rows) => (Array.isArray(rows) ? rows : Array.isArray(rows?.content) ? rows.content : []);

let categoriesPromise = null;

/** Active device categories; bundled rows if master data is unreachable. */
export function fetchSellCategories() {
  if (!categoriesPromise) {
    categoriesPromise = masterApi
      .get('/master/device-categories')
      .then((rows) => {
        const list = sortDeviceCategories(unwrap(rows).filter((c) => c.isActive !== false));
        return Array.isArray(list) && list.length ? list : DEVICE_CATEGORIES;
      })
      .catch(() => {
        categoriesPromise = null;
        return DEVICE_CATEGORIES;
      });
  }
  return categoriesPromise;
}

export async function findCategory(code) {
  const wanted = String(code || '').trim().toUpperCase();
  if (!wanted) return null;
  const list = await fetchSellCategories();
  return list.find((c) => String(c.code || '').toUpperCase() === wanted) || null;
}

export async function fetchCategoryBrands(code) {
  const rows = await masterApi.get(`/master/categories/by-code/${encodeURIComponent(String(code).toUpperCase())}/brands`);
  return unwrap(rows).sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
}

export async function fetchBrand(brandId) {
  const rows = await masterApi.get('/master/brands');
  return unwrap(rows).find((b) => String(b.id) === String(brandId)) || null;
}

export async function fetchSellModels(brandId, categoryId) {
  const rows = unwrap(await masterApi.get(`/master/brands/${encodeURIComponent(brandId)}/models`));
  return rows
    .filter((m) => (!categoryId || !m.categoryId || m.categoryId === categoryId) && m.sellActive !== false)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' }));
}

/** Web routes for each step — one page per step, the selection carried in the query string. */
export const sellBrandHref = (categoryCode) =>
  categoryCode ? `/shop-home/sell/select-brand/?category=${encodeURIComponent(categoryCode)}` : '/shop-home/sell/select-brand/';
export const sellModelHref = (categoryCode, brandId) =>
  `/shop-home/sell/select-model/?category=${encodeURIComponent(categoryCode)}&brand=${encodeURIComponent(brandId)}`;
