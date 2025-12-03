import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Red Guardian - Community Safety & Incident Reporting App",
  description: "Join Red Guardian to report and monitor community safety incidents. Help keep your neighborhood safe with real-time incident tracking, anonymous reporting, and community collaboration.",
  keywords: "community safety, incident reporting, neighborhood watch, crime reporting, safety app, community protection, incident tracking, anonymous reporting",
  authors: [{ name: "Red Guardian Team" }],
  creator: "Red Guardian",
  publisher: "Red Guardian",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://guardian.red'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Red Guardian - Community Safety & Incident Reporting",
    description: "Join Red Guardian to report and monitor community safety incidents. Help keep your neighborhood safe with real-time incident tracking.",
    url: "https://guardian.red",
    siteName: "Red Guardian",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Red Guardian - Community Safety App",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Red Guardian - Community Safety & Incident Reporting",
    description: "Join Red Guardian to report and monitor community safety incidents. Help keep your neighborhood safe.",
    images: ["/og-image.png"],
    creator: "@redguardianapp",
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Red Guardian"
  },
  icons: {
    apple: "/icon-192.png"
  }
};

export const viewport = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";

export default async function RootLayout({ children, params: { locale } }) {
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Red Guardian" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Red Guardian",
              "description": "Community safety and incident reporting app for monitoring and reporting neighborhood incidents",
              "url": "https://guardian.red",
              "applicationCategory": "SafetyApplication",
              "operatingSystem": "Web, iOS, Android",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "creator": {
                "@type": "Organization",
                "name": "Red Guardian Team"
              },
              "potentialAction": {
                "@type": "UseAction",
                "target": "https://redguardian.app",
                "description": "Report community safety incidents"
              }
            })
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
