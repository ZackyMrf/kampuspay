export function calculateTrustScore({ paidOrders = 0, totalOrders = 0 } = {}) {
  if (!totalOrders) return 0
  return Math.round((paidOrders / totalOrders) * 100)
}

export function getSellerBadge({ activeProducts = 0, paidOrders = 0 } = {}) {
  if (paidOrders >= 5) return 'Trusted Seller'
  if (paidOrders >= 1) return 'Verified Campus Seller'
  if (activeProducts >= 1) return 'Campus Seller'
  return 'New Seller'
}

export function getSellerBadgeTone(badge) {
  if (badge === 'Trusted Seller') return 'success'
  if (badge === 'Verified Campus Seller') return 'cyan'
  if (badge === 'Campus Seller') return 'purple'
  return 'muted'
}

export function buildSellerTrust({ activeProducts = 0, paidOrders = 0, totalOrders = 0 } = {}) {
  return {
    activeProducts,
    paidOrders,
    totalOrders,
    trustScore: calculateTrustScore({ paidOrders, totalOrders }),
    badge: getSellerBadge({ activeProducts, paidOrders, totalOrders }),
  }
}
