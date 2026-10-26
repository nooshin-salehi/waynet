// سبد خرید مشترک دوره و تجهیزات؛ همان کلید و ساختار نسخهٔ EJS (waynet-cart-v2).
const KEY = 'waynet-cart-v2';
export const getCart = () => {
  try {
    const current = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(current)) return current;
    const legacy = JSON.parse(localStorage.getItem('waynet-cart') || '[]');
    return Array.isArray(legacy) ? legacy.map(id => ({ id: String(id), type: 'course', qty: 1 })) : [];
  } catch (e) { return []; }
};
export const setCart = items => {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('waynet-cart'));
};
export const cartCount = () => getCart().reduce((n, i) => n + (Number(i.qty) || 1), 0);
export function addToCart(item) {
  const c = getCart();
  const existing = c.find(x => x.id === item.id && x.type === item.type);
  if (item.type === 'course' && existing) { alert('این دوره قبلاً در سبد خرید شماست.'); return false; }
  if (existing) existing.qty = (Number(existing.qty) || 1) + (Number(item.qty) || 1);
  else c.push({ ...item, qty: item.type === 'course' ? 1 : Math.max(1, Number(item.qty) || 1) });
  setCart(c);
  return true;
}
