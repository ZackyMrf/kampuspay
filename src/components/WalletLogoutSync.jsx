import { useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useAuth } from './authContext'
import { useToast } from './toastContext'
import { useI18n } from '../i18n/LanguageProvider'

export default function WalletLogoutSync() {
  const { t } = useI18n()
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
          toast.info(t('wallet.autoLogout'))
        })
        .catch((error) => {
          toast.error(error.message || t('wallet.autoLogoutFailed'))
        })
        .finally(() => {
          hadConnectedWallet.current = false
          loggingOut.current = false
        })
    }
  }, [connected, connecting, isLoggedIn, logout, t, toast])

  return null
}
