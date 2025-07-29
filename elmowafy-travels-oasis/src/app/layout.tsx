import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { AIAssistantProvider } from '@/contexts/AIAssistantContext';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Elmowafy Travel Oasis',
  description: 'Your family travel and memories platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PreferencesProvider>
            <AIAssistantProvider>
              {children}
              <Toaster />
            </AIAssistantProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
