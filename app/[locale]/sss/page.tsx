import type { Metadata } from "next";

const FAQ_TR = [
  {
    q: "Pusulam nedir?",
    a: "Pusulam, Turkiye'nin kolektif zeka platformudur. Kullanicilar gercek dunya olaylari hakkinda tahminler yapar, toplulukla kiyaslar ve dogru tahminlerle itibar kazanir. Bahis veya kumar sitesi degildir.",
  },
  {
    q: "Pusulam'da gercek para kullaniliyor mu?",
    a: "Hayir. Pusulam'da 'Oy Hakki' adli sanal bir birim kullanilir. Oy Hakki gercek paraya donusturulemez. Platform tamamen ucretsizdir.",
  },
  {
    q: "Nasil kayit olurum?",
    a: "pusulam.ai adresine girin, 'Kayit Ol' butonuna tiklayin, e-posta, kullanici adi ve sifre belirleyin. Hesabiniza aninda 50 Oy Hakki yuklenir.",
  },
  {
    q: "Oy Hakki nedir ve nasil kazanilir?",
    a: "Oy Hakki, platformdaki tahmin biriminizdir. Her gun +3 ucretsiz Oy Hakki verilir. Dogru tahminleriniz sonuclandiginda Oy Hakki geri kazanirsiniz. Ayrica rozet kazanarak bonus Oy Hakki elde edebilirsiniz.",
  },
  {
    q: "Tahmin nasil yapilir?",
    a: "Piyasalar sayfasindan bir konu secin. 'Evet' veya 'Hayir' oyunuzu verin ve ne kadar Oy Hakki harcamak istediginizi belirleyin. Olasilik dusukken girerseniz daha fazla pay alirsiniz — dogru cikarsa daha cok kazanirsiniz.",
  },
  {
    q: "Piyasa oranlari nasil belirleniyor?",
    a: "Pusulam, CPMM (Constant Product Market Maker) kullanir. Oranlar topluluk oylamalarina gore otomatik degisir. Ayrica Polymarket gibi global platformlardan referans oranlari saatlik olarak senkronize edilir.",
  },
  {
    q: "Hangi konularda piyasalar var?",
    a: "Ekonomi, siyaset, teknoloji, gundem, dunya ve egitim kategorilerinde piyasalar bulunur. Spor bahisleri platformda yer almaz.",
  },
  {
    q: "Rozet sistemi nasil calisiyor?",
    a: "20 farkli rozet vardir. Tahmin sayisi, dogru tahmin sayisi, isabet orani, gunluk seri, arkadas sayisi ve yorum sayisina gore otomatik kazanilir. Her rozet seviyesine gore Oy Hakki odulu verilir: Bronze +5, Silver +15, Gold +30, Platinum +50.",
  },
  {
    q: "AI Asistan ne ise yarar?",
    a: "Pusulam AI Asistani, piyasalar hakkinda analiz yapar, farkli bakis acilari sunar ve guncel bilgileri web'den arar. Tahmin tavsiyesi vermez, sadece bilgilendirici analiz sunar.",
  },
  {
    q: "Pusulam yasal mi?",
    a: "Evet. Pusulam bir kolektif zeka platformudur, bahis veya kumar sitesi degildir. Gercek para kullanilmaz ve Oy Hakki nakde donusturulemez. Platform 7258 sayili kanun kapsaminda bahis faaliyeti yurutmez.",
  },
  {
    q: "Piyasa nasil sonuclanir?",
    a: "Piyasalar bitis tarihinde otomatik olarak kapanir. AI destekli sistem guncel haberleri ve kaynaklari tarayarak sonucu belirler. Gerektiginde admin tarafindan manuel olarak da sonuclandirilabilir.",
  },
  {
    q: "Arkadaslarimi nasil eklerim?",
    a: "Kullanicilar sayfasindan arkadas ekleyebilirsiniz. Arkadaslarinizin tahminlerini akis sayfasinda gorebilir ve arkadaslar arasi skor tablosunda karsilastirabilirsiniz.",
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === "tr" ? "Sikca Sorulan Sorular" : "Frequently Asked Questions";
  return {
    title,
    description: "Pusulam hakkinda merak edilen sorular ve cevaplari. Nasil kayit olunur, Oy Hakki nedir, tahmin nasil yapilir ve daha fazlasi.",
    alternates: {
      canonical: `https://pusulam.ai/${locale}/sss`,
    },
  };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;

  // JSON-LD FAQPage schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_TR.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-8 text-3xl font-bold">Sikca Sorulan Sorular</h1>

        <div className="space-y-4">
          {FAQ_TR.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            >
              <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {item.q}
                <svg
                  className="h-4 w-4 shrink-0 text-gray-400 transition group-open:rotate-180"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-gray-600 dark:border-gray-800 dark:text-gray-400">
                {item.a}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-teal-50 p-6 text-center dark:bg-teal-900/20">
          <p className="text-sm text-teal-700 dark:text-teal-400">
            Baska sorulariniz mi var? AI Asistanimiza sorun veya{" "}
            <a href="mailto:info@pusulam.ai" className="font-semibold underline">
              info@pusulam.ai
            </a>{" "}
            adresine yazin.
          </p>
        </div>
      </div>
    </>
  );
}
