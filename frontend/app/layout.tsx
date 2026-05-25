import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AutoLLM Forge | Fine-Tuning Studio',
  description:
    'Modern fine-tuning workspace for building specialized language models with guided QLoRA workflows.',
  keywords: ['LLM', 'fine-tuning', 'QLoRA', 'machine learning', 'model training'],
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="%237c3aed"/><path d="M18 20h28v6H18zM18 30h20v6H18zM18 40h28v6H18z" fill="%23e0e7ff"/></svg>',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
