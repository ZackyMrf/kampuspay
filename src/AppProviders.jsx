import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import App from './App'
import { AuthProvider } from './components/AuthProvider'
import { ToastProvider } from './components/ToastProvider'
import WalletLogoutSync from './components/WalletLogoutSync'
import { SOLANA_RPC_URL } from './utils/solanaConfig'

const wallets = []

export default function AppProviders() {
  return (
    <ConnectionProvider endpoint={SOLANA_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <ToastProvider>
          <AuthProvider>
            <WalletLogoutSync />
            <App />
          </AuthProvider>
        </ToastProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
