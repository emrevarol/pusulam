import type { Metadata } from "next";

const FAQ_TR = [
  {
    q: "Pusulam nedir?",
    a: "Pusulam, Türkiye'nin kolektif zekâ platformudur. Kullanıcılar gerçek dünya olayları hakkında tahminler yapar, toplulukla kıyaslar ve doğru tahminlerle itibar kazanır. Bahis veya kumar sitesi değildir.",
  },
  {
    q: "Pusulam'da gerçek para kullanılıyor mu?",
    a: "Hayır. Pusulam'da 'Oy Hakkı' adlı sanal bir birim kullanılır. Oy Hakkı gerçek paraya dönüştürülemez. Platform tamamen ücretsizdir.",
  },
  {
    q: "Nasıl kayıt olurum?",
    a: "pusulam.ai adresine girin, 'Kayıt Ol' butonuna tıklayın, e-posta, kullanıcı adı ve şifre belirleyin. Hesabınıza anında 50 Oy Hakkı yüklenir.",
  },
  {
    q: "Oy Hakkı nedir ve nasıl kazanılır?",
    a: "Oy Hakkı, platformdaki tahmin biriminizdir. Her gün +3 ücretsiz Oy Hakkı verilir. Doğru tahminleriniz sonuçlandığında Oy Hakkı geri kazanırsınız. Ayrıca rozet kazanarak bonus Oy Hakkı elde edebilirsiniz.",
  },
  {
    q: "Tahmin nasıl yapılır?",
    a: "Piyasalar sayfasından bir konu seçin. 'Evet' veya 'Hayır' oyunuzu verin ve ne kadar Oy Hakkı harcamak istediğinizi belirleyin. Olasılık düşükken girerseniz daha fazla pay alırsınız — doğru çıkarsa daha çok kazanırsınız.",
  },
  {
    q: "Piyasa oranları nasıl belirleniyor?",
    a: "Pusulam, CPMM (Constant Product Market Maker) kullanır. Oranlar topluluk oylamalarına göre otomatik değişir. Ayrıca Polymarket gibi global platformlardan referans oranları saatlik olarak senkronize edilir.",
  },
  {
    q: "Hangi konularda piyasalar var?",
    a: "Ekonomi, siyaset, teknoloji, gündem, dünya ve eğitim kategorilerinde piyasalar bulunur. Spor bahisleri platformda yer almaz.",
  },
  {
    q: "Rozet sistemi nasıl çalışıyor?",
    a: "20 farklı rozet vardır. Tahmin sayısı, doğru tahmin sayısı, isabet oranı, günlük seri, arkadaş sayısı ve yorum sayısına göre otomatik kazanılır. Her rozet seviyesine göre Oy Hakkı ödülü verilir: Bronze +5, Silver +15, Gold +30, Platinum +50.",
  },
  {
    q: "AI Asistan ne işe yarar?",
    a: "Pusulam AI Asistanı, piyasalar hakkında analiz yapar, farklı bakış açıları sunar ve güncel bilgileri web'den arar. Tahmin tavsiyesi vermez, sadece bilgilendirici analiz sunar.",
  },
  {
    q: "Pusulam yasal mı?",
    a: "Evet. Pusulam bir kolektif zekâ platformudur, bahis veya kumar sitesi değildir. Gerçek para kullanılmaz ve Oy Hakkı nakde dönüştürülemez. Platform 7258 sayılı kanun kapsamında bahis faaliyeti yürütmez.",
  },
  {
    q: "Piyasa nasıl sonuçlanır?",
    a: "Piyasalar bitiş tarihinde otomatik olarak kapanır. AI destekli sistem güncel haberleri ve kaynakları tarayarak sonucu belirler. Gerektiğinde admin tarafından manuel olarak da sonuçlandırılabilir.",
  },
  {
    q: "Arkadaşlarımı nasıl eklerim?",
    a: "Kullanıcılar sayfasından arkadaş ekleyebilirsiniz. Arkadaşlarınızın tahminlerini akış sayfasında görebilir ve arkadaşlar arası skor tablosunda karşılaştırabilirsiniz.",
  },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === "tr" ? "Sıkça Sorulan Sorular" : "Frequently Asked Questions";
  return {
    title,
    description: "Pusulam hakkında merak edilen sorular ve cevapları. Nasıl kayıt olunur, Oy Hakkı nedir, tahmin nasıl yapılır ve daha fazlası.",
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
        <h1 className="mb-8 text-3xl font-bold">Sıkça Sorulan Sorular</h1>

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
            Başka sorularınız mı var? AI Asistanımıza sorun veya{" "}
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
