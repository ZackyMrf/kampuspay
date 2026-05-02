import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import App from './App'
import { ToastProvider } from './components/ToastProvider'
import { SOLANA_RPC_URL } from './utils/solanaConfig'

const wallets = []

export default function AppProviders() {
  return (
    <ConnectionProvider endpoint={SOLANA_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <ToastProvider>
          <App />
        </ToastProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
