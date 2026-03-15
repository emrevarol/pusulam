import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Script from "next/script";
import "../globals.css";

const GA_ID = "G-W4H94YR1MW";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pusulam — Turkiye'nin Kolektif Zeka Platformu",
    template: "%s | Pusulam",
  },
  description:
    "Turkiye gundemindeki olaylara tahminlerini yap, toplulukla kiyasla, itibar kazan. Ekonomi, siyaset, teknoloji ve dunya olaylari icin tahmin piyasalari.",
  metadataBase: new URL("https://pusulam.ai"),
  openGraph: {
    title: "Pusulam — Turkiye'nin Kolektif Zeka Platformu",
    description:
      "Turkiye gundemindeki olaylara tahminlerini yap, toplulukla kiyasla, itibar kazan.",
    url: "https://pusulam.ai",
    siteName: "Pusulam",
    type: "website",
    locale: "tr_TR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pusulam — Turkiye'nin Kolektif Zeka Platformu",
    description:
      "Turkiye gundemindeki olaylara tahminlerini yap, toplulukla kiyasla, itibar kazan.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://pusulam.ai",
    languages: {
      tr: "https://pusulam.ai/tr",
      en: "https://pusulam.ai/en",
    },
  },
  manifest: "/manifest.json",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className="scroll-smooth" suppressHydrationWarning>
      <head>
        {/* Organization structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Pusulam",
              url: "https://pusulam.ai",
              description: "Turkiye'nin Kolektif Zeka Platformu. Tahmin piyasalari ile gelecegi ongor.",
              sameAs: [],
            }),
          }}
        />
        {/* Prevent flash of wrong theme — runs before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.documentElement,t=localStorage.getItem('pusulam-theme');if(t==='light'){d.classList.remove('dark')}else if(t==='dark'){d.classList.add('dark')}else if(window.matchMedia('(prefers-color-scheme:dark)').matches){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100`}
        suppressHydrationWarning
      >
        <Providers>
          <NextIntlClientProvider messages={messages}>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
