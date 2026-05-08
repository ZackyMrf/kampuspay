import { useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from './authContext'
import { useToast } from './toastContext'

export default function WalletLogoutSync() {
  const { connected, connecting } = useWallet()
  const { isLoggedIn, logout } = useAuth()
  const toast = useToast()
  const hadConnectedWallet = useRef(false)
  const loggingOut = useRef(false)

  useEffect(() => {
    if (connected) {
      hadConnectedWallet.current = true
      return
    }

    if (!isLoggedIn) {
      hadConnectedWallet.current = false
      loggingOut.current = false
      return
    }

    if (!connecting && hadConnectedWallet.current && !loggingOut.current) {
      loggingOut.current = true
      logout()
        .then(() => {
          toast.info('Wallet disconnected. Akun otomatis logout.')
        })
        .catch((error) => {
          toast.error(error.message || 'Gagal logout setelah wallet disconnect.')
        })
        .finally(() => {
          hadConnectedWallet.current = false
          loggingOut.current = false
        })
    }
  }, [connected, connecting, isLoggedIn, logout, toast])

  return null
}
