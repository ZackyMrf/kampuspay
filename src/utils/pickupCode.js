export function generatePickupCode() {
  const randomNumber = Math.floor(1000 + Math.random() * 9000)
  const timestamp = Date.now().toString().slice(-4)
  return `KP-${randomNumber}-${timestamp}`
}

export function formatPickupStatus(status) {
  if (status === 'picked_up') return 'Picked Up'
  if (status === 'cancelled') return 'Cancelled'
  return 'Waiting Pickup'
}

export function getPickupStatusTone(status) {
  if (status === 'picked_up') return 'success'
  if (status === 'cancelled') return 'danger'
  return 'warning'
}
