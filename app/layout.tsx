import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Live Translation App',
  description: 'Real-time French to English audio translation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
