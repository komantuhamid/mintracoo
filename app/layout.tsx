import './globals.css';
import { RootProvider } from '@/app/providers';

export const metadata = {
  title: 'Raccoon Pixel Art Mint',
  description: 'AI-generated pixel art NFT minting on Farcaster',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
