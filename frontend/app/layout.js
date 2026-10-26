import './globals.css';

export const metadata = {
  title: 'KisanSetu — Real-time procurement coordination',
  description: 'Book a slot, know when to arrive, track your procurement in real time.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
