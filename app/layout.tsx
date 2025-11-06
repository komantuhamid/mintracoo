import './globals.css';
import { WagmiProviders } from '@/providers/wagmi';
import { QueryProvider } from '@/providers/query';

export const metadata = { title: 'Raccoon Pixel Art Mint', description: 'Farcaster Mini App' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <WagmiProviders>{children}</WagmiProviders>
        </QueryProvider>
      </body>
    </html>
  );
}
