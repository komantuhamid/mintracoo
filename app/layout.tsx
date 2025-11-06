import './globals.css';
import { WagmiProviders } from '@/providers/wagmi';

export const metadata = { title: 'AI PFP Mint', description: 'Farcaster Mini App' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WagmiProviders>{children}</WagmiProviders>
      </body>
    </html>
  );
}
