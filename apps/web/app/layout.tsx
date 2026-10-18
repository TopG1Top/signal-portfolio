import type { Metadata } from 'next';
import { Providers } from '../components/providers';
import './globals.css';
export const metadata: Metadata = {
  title: 'SIGNAL — Global Event Intelligence',
  description: 'Source-grounded global event intelligence. See the world as it happens.',
  manifest: '/manifest.webmanifest',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
