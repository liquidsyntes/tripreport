import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Trip Reports',
  description: 'A minimalistic personal trip report manager',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Toaster position="top-center" richColors />
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
