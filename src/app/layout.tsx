import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShiftPoint Dashboard",
  description: "لوحة تحكم نظام ShiftPoint",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const mode = localStorage.getItem('theme-mode') || 'dark';
                  const color = localStorage.getItem('theme-color') || 'purple';
                  const shade = localStorage.getItem('theme-bg-shade') || '1';
                  
                  document.documentElement.setAttribute('data-mode', mode);
                  document.documentElement.setAttribute('data-theme-color', color);
                  document.documentElement.setAttribute('data-bg-shade', shade);
                  
                  if (mode === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('wheel', function(event) {
                if (document.activeElement && document.activeElement.type === 'number') {
                  document.activeElement.blur();
                }
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
