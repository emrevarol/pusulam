import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// CPMM pool helper: for target YES probability p and liquidity L
// yesPool = L * (1 - p), noPool = L * p
// Verify: yesPrice = noPool / (yesPool + noPool) = L*p / L = p ✓
function pools(yesProbability: number, liquidity = 10000) {
  return {
    yesPool: Math.round(liquidity * (1 - yesProbability)),
    noPool: Math.round(liquidity * yesProbability),
  };
}

// Translation type
type Translations = Record<string, string>;

// All 15 market translations
const marketTranslations: {
  title: Translations;
  description: Translations;
}[] = [
  // 0: Dolar/TL Haziran 2026
  {
    title: {
      en: "Will USD/TRY exceed 46 by end of June 2026?",
      es: "¿El USD/TRY superará 46 a finales de junio de 2026?",
      fr: "Le USD/TRY dépassera-t-il 46 fin juin 2026 ?",
      de: "Wird USD/TRY bis Ende Juni 2026 die 46 überschreiten?",
      ar: "هل سيتجاوز الدولار/الليرة التركية 46 بنهاية يونيو 2026؟",
      pt: "O USD/TRY vai ultrapassar 46 até o final de junho de 2026?",
      rw: "USD/TRY izarenza 46 mu mpera za Kamena 2026?",
      sw: "Je, USD/TRY itazidi 46 mwishoni mwa Juni 2026?",
      am: "USD/TRY በ2026 ሰኔ መጨረሻ 46ን ያልፋል?",
    },
    description: {
      en: "Based on TCMB official rate. If USD/TRY is 46.00 or above at close on June 30, 2026, resolves YES. Currently ~44 TL, the Iran war and oil prices are adding pressure on TL.",
      es: "Basado en la tasa oficial del TCMB. Si USD/TRY es 46.00 o más al cierre del 30 de junio de 2026, se resuelve SÍ. Actualmente ~44 TL, la guerra de Irán y los precios del petróleo presionan la TL.",
      fr: "Basé sur le taux officiel de la TCMB. Si USD/TRY est à 46.00 ou plus à la clôture du 30 juin 2026, résolu OUI. Actuellement ~44 TL, la guerre en Iran et les prix du pétrole font pression sur la TL.",
      de: "Basierend auf dem offiziellen TCMB-Kurs. Wenn USD/TRY am 30. Juni 2026 bei 46,00 oder darüber schließt, wird JA aufgelöst. Derzeit ~44 TL, der Iran-Krieg und Ölpreise belasten die TL.",
      ar: "بناءً على سعر البنك المركزي التركي الرسمي. إذا كان الدولار/الليرة التركية عند 46.00 أو أعلى عند الإغلاق في 30 يونيو 2026، تكون الإجابة نعم.",
      pt: "Com base na taxa oficial do TCMB. Se USD/TRY estiver em 46,00 ou acima no fechamento de 30 de junho de 2026, resolve SIM.",
      rw: "Bishingiye ku giciro cyemewe cya TCMB. Niba USD/TRY ari 46.00 cyangwa hejuru ku itariki ya 30 Kamena 2026, igisubizo ni YEGO.",
      sw: "Kulingana na kiwango rasmi cha TCMB. Ikiwa USD/TRY ni 46.00 au zaidi wakati wa kufunga Juni 30, 2026, jibu ni NDIYO.",
      am: "በTCMB ኦፊሴላዊ ተመን ላይ የተመሰረተ። በ2026 ሰኔ 30 መዝጊያ ላይ USD/TRY 46.00 ወይም ከዚያ በላይ ከሆነ አዎ ይፈታል።",
    },
  },
  // 1: TCMB Nisan faiz
  {
    title: {
      en: "Will TCMB pause rate cuts in April 2026?",
      es: "¿El TCMB pausará los recortes de tasas en abril de 2026?",
      fr: "La TCMB suspendra-t-elle les baisses de taux en avril 2026 ?",
      de: "Wird die TCMB im April 2026 Zinssenkungen pausieren?",
      ar: "هل سيوقف البنك المركزي التركي تخفيض أسعار الفائدة في أبريل 2026؟",
      pt: "O TCMB pausará os cortes de juros em abril de 2026?",
      rw: "TCMB izahagarika kugabanya inyungu muri Mata 2026?",
      sw: "Je, TCMB itasimamisha kupunguza riba Aprili 2026?",
      am: "TCMB በ2026 ሚያዝያ የወለድ ቅነሳን ያቆማል?",
    },
    description: {
      en: "If TCMB keeps the policy rate unchanged at its April 2026 meeting, resolves YES. Rate is currently 37%, consecutive cuts were made but the Iran war oil shock may cause a pause.",
      es: "Si el TCMB mantiene la tasa de política sin cambios en su reunión de abril 2026, se resuelve SÍ.",
      fr: "Si la TCMB maintient le taux directeur inchangé lors de sa réunion d'avril 2026, résolu OUI.",
      de: "Wenn die TCMB den Leitzins bei ihrer Sitzung im April 2026 unverändert lässt, wird JA aufgelöst.",
      ar: "إذا أبقى البنك المركزي التركي على سعر الفائدة دون تغيير في اجتماع أبريل 2026، تكون الإجابة نعم.",
      pt: "Se o TCMB mantiver a taxa de juros inalterada na reunião de abril de 2026, resolve SIM.",
      rw: "Niba TCMB ikomeza inyungu nta gihinduka mu nama ya Mata 2026, igisubizo ni YEGO.",
      sw: "Ikiwa TCMB itaweka kiwango cha riba bila kubadilika katika mkutano wa Aprili 2026, jibu ni NDIYO.",
      am: "TCMB በ2026 ሚያዝያ ስብሰባው ላይ የፖሊሲ ተመንን ሳይለውጥ ካቆየ አዎ ይፈታል።",
    },
  },
  // 2: Brent petrol
  {
    title: {
      en: "Will Brent crude stay above $100/barrel by end of March?",
      es: "¿El crudo Brent se mantendrá por encima de $100/barril a finales de marzo?",
      fr: "Le Brent restera-t-il au-dessus de 100 $/baril fin mars ?",
      de: "Bleibt Brent-Rohöl bis Ende März über 100 $/Barrel?",
      ar: "هل سيبقى خام برنت فوق 100 دولار/برميل بنهاية مارس؟",
      pt: "O petróleo Brent ficará acima de $100/barril no final de março?",
      rw: "Peteroli ya Brent izaguma hejuru ya $100/barili mu mpera za Werurwe?",
      sw: "Je, mafuta ghafi ya Brent yatabaki juu ya $100/pipa mwishoni mwa Machi?",
      am: "ብሬንት ክሩድ በማርች መጨረሻ ከ$100/በርሜል በላይ ይቆያል?",
    },
    description: {
      en: "If Brent crude oil futures price is $100/barrel or above at close on March 31, 2026, resolves YES. Prices surged from $70 to $119 after Iran war closed the Strait of Hormuz.",
      es: "Si el precio de futuros del crudo Brent es $100/barril o más al cierre del 31 de marzo de 2026, se resuelve SÍ.",
      fr: "Si le prix des contrats à terme du Brent est de 100 $/baril ou plus à la clôture du 31 mars 2026, résolu OUI.",
      de: "Wenn der Brent-Rohöl-Futures-Preis am 31. März 2026 bei 100 $/Barrel oder darüber schließt, wird JA aufgelöst.",
      ar: "إذا كان سعر العقود الآجلة لخام برنت 100 دولار/برميل أو أعلى عند الإغلاق في 31 مارس 2026، تكون الإجابة نعم.",
      pt: "Se o preço futuro do petróleo Brent for $100/barril ou mais no fechamento de 31 de março de 2026, resolve SIM.",
      rw: "Niba igiciro cya peteroli ya Brent ari $100/barili cyangwa hejuru ku itariki ya 31 Werurwe 2026, igisubizo ni YEGO.",
      sw: "Ikiwa bei ya mafuta ya Brent ni $100/pipa au zaidi wakati wa kufunga Machi 31, 2026, jibu ni NDIYO.",
      am: "የብሬንት ክሩድ ዘይት ፊውቸርስ ዋጋ በ2026 ማርች 31 መዝጊያ $100/በርሜል ወይም ከዚያ በላይ ከሆነ አዎ ይፈታል።",
    },
  },
  // 3: Enflasyon %35
  {
    title: {
      en: "Will Turkey's March 2026 annual inflation exceed 35%?",
      es: "¿La inflación anual de Turquía en marzo 2026 superará el 35%?",
      fr: "L'inflation annuelle de la Turquie en mars 2026 dépassera-t-elle 35 % ?",
      de: "Wird die Jahresinflation der Türkei im März 2026 35 % überschreiten?",
      ar: "هل سيتجاوز التضخم السنوي في تركيا لشهر مارس 2026 نسبة 35%؟",
      pt: "A inflação anual da Turquia em março de 2026 ultrapassará 35%?",
      rw: "Igabanuka ry'ibiciro rya buri mwaka rya Turukiya muri Werurwe 2026 rizarenza 35%?",
      sw: "Je, mfumuko wa bei wa mwaka wa Uturuki Machi 2026 utazidi 35%?",
      am: "የቱርክ የ2026 ማርች ዓመታዊ ዋጋ ንረት 35% ያልፋል?",
    },
    description: {
      en: "If TUIK March 2026 annual CPI data is 35.00% or above, resolves YES. February was 31.53%, oil prices may add upward pressure.",
      es: "Si el dato del IPC anual de TUIK de marzo 2026 es 35.00% o superior, se resuelve SÍ.",
      fr: "Si l'IPC annuel TUIK de mars 2026 est de 35,00 % ou plus, résolu OUI.",
      de: "Wenn der jährliche VPI von TUIK im März 2026 bei 35,00 % oder darüber liegt, wird JA aufgelöst.",
      ar: "إذا كان مؤشر أسعار المستهلك السنوي لشهر مارس 2026 عند 35.00% أو أعلى، تكون الإجابة نعم.",
      pt: "Se o IPC anual do TUIK de março de 2026 for 35,00% ou mais, resolve SIM.",
      rw: "Niba imibare ya TUIK ya Werurwe 2026 ari 35.00% cyangwa hejuru, igisubizo ni YEGO.",
      sw: "Ikiwa data ya CPI ya kila mwaka ya TUIK Machi 2026 ni 35.00% au zaidi, jibu ni NDIYO.",
      am: "የTUIK ማርች 2026 ዓመታዊ CPI መረጃ 35.00% ወይም ከዚያ በላይ ከሆነ አዎ ይፈታል።",
    },
  },
  // 4: Imamoglu davasi
  {
    title: {
      en: "Will the Imamoglu trial reach a verdict by end of 2026?",
      es: "¿El juicio de Imamoglu llegará a un veredicto antes de finales de 2026?",
      fr: "Le procès Imamoglu aboutira-t-il à un verdict d'ici fin 2026 ?",
      de: "Wird das Imamoglu-Verfahren bis Ende 2026 zu einem Urteil kommen?",
      ar: "هل ستصدر محاكمة إمام أوغلو حكمًا بنهاية 2026؟",
      pt: "O julgamento de Imamoglu chegará a um veredicto até o final de 2026?",
      rw: "Urubanza rwa Imamoglu ruzagera ku mwanzuro mbere y'impera za 2026?",
      sw: "Je, kesi ya Imamoglu itafikia hukumu kabla ya mwisho wa 2026?",
      am: "የኢማሞግሉ ክስ በ2026 መጨረሻ ውሳኔ ይደርሳል?",
    },
    description: {
      en: "If a verdict is reached in the corruption trial of Istanbul Mayor Ekrem Imamoglu within 2026, resolves YES. The trial started March 9, 2026 with 400 defendants and a 3,900-page indictment.",
      es: "Si se emite un veredicto en el juicio por corrupción del alcalde de Estambul Ekrem Imamoglu dentro de 2026, se resuelve SÍ.",
      fr: "Si un verdict est rendu dans le procès pour corruption du maire d'Istanbul Ekrem Imamoglu en 2026, résolu OUI.",
      de: "Wenn im Korruptionsprozess des Istanbuler Bürgermeisters Ekrem Imamoglu innerhalb von 2026 ein Urteil gefällt wird, wird JA aufgelöst.",
      ar: "إذا صدر حكم في محاكمة الفساد لرئيس بلدية إسطنبول أكرم إمام أوغلو خلال 2026، تكون الإجابة نعم.",
      pt: "Se um veredicto for alcançado no julgamento de corrupção do prefeito de Istambul Ekrem Imamoglu dentro de 2026, resolve SIM.",
      rw: "Niba urubanza rw'ubujura rwa Meya wa Istanbul Ekrem Imamoglu rugezeho mu 2026, igisubizo ni YEGO.",
      sw: "Ikiwa hukumu itatolewa katika kesi ya rushwa ya Meya wa Istanbul Ekrem Imamoglu ndani ya 2026, jibu ni NDIYO.",
      am: "የኢስታንቡል ከንቲባ ኤክረም ኢማሞግሉ የሙስና ክስ በ2026 ውስጥ ውሳኔ ላይ ከደረሰ አዎ ይፈታል።",
    },
  },
  // 5: Sosyal medya yasagi
  {
    title: {
      en: "Will the under-15 social media ban become law in 2026?",
      es: "¿La prohibición de redes sociales para menores de 15 se convertirá en ley en 2026?",
      fr: "L'interdiction des réseaux sociaux aux moins de 15 ans deviendra-t-elle loi en 2026 ?",
      de: "Wird das Social-Media-Verbot für unter 15-Jährige 2026 Gesetz?",
      ar: "هل سيصبح حظر وسائل التواصل الاجتماعي لمن هم دون 15 عامًا قانونًا في 2026؟",
      pt: "A proibição de redes sociais para menores de 15 anos se tornará lei em 2026?",
      rw: "Itegeko ribuza abari munsi y'imyaka 15 gukoresha imbuga nkoranyambaga rizashyirwaho mu 2026?",
      sw: "Je, marufuku ya mitandao ya kijamii kwa watoto chini ya 15 itakuwa sheria 2026?",
      am: "ከ15 ዓመት በታች ለሆኑ የማህበራዊ ሚዲያ ዕገዳ በ2026 ሕግ ይሆናል?",
    },
    description: {
      en: "If AKP's under-15 social media ban bill, submitted to parliament on March 4, becomes law within 2026, resolves YES.",
      es: "Si el proyecto de ley del AKP para prohibir redes sociales a menores de 15, presentado al parlamento el 4 de marzo, se convierte en ley en 2026, se resuelve SÍ.",
      fr: "Si le projet de loi de l'AKP interdisant les réseaux sociaux aux moins de 15 ans, soumis au parlement le 4 mars, devient loi en 2026, résolu OUI.",
      de: "Wenn der AKP-Gesetzentwurf zum Social-Media-Verbot für unter 15-Jährige, der am 4. März ins Parlament eingebracht wurde, 2026 Gesetz wird, wird JA aufgelöst.",
      ar: "إذا أصبح مشروع قانون حظر وسائل التواصل لمن هم دون 15 قانونًا في 2026، تكون الإجابة نعم.",
      pt: "Se o projeto de lei do AKP proibindo redes sociais para menores de 15, apresentado ao parlamento em 4 de março, se tornar lei em 2026, resolve SIM.",
      rw: "Niba itegeko rya AKP ribujije abari munsi y'imyaka 15 imbuga nkoranyambaga rishyizweho mu 2026, igisubizo ni YEGO.",
      sw: "Ikiwa muswada wa AKP wa kupiga marufuku mitandao ya kijamii kwa watoto chini ya 15 utakuwa sheria 2026, jibu ni NDIYO.",
      am: "የAKP ከ15 ዓመት በታች የማህበራዊ ሚዲያ ዕገዳ ረቂቅ ሕግ በ2026 ሕግ ከሆነ አዎ ይፈታል።",
    },
  },
  // 6: Erken secim
  {
    title: {
      en: "Will early elections be called by end of 2027?",
      es: "¿Se convocarán elecciones anticipadas antes de finales de 2027?",
      fr: "Des élections anticipées seront-elles annoncées d'ici fin 2027 ?",
      de: "Werden bis Ende 2027 vorgezogene Wahlen ausgerufen?",
      ar: "هل ستُعلن انتخابات مبكرة بنهاية 2027؟",
      pt: "Eleições antecipadas serão convocadas até o final de 2027?",
      rw: "Amatora mbere y'igihe azatangazwa mbere y'impera za 2027?",
      sw: "Je, uchaguzi wa mapema utatangazwa kabla ya mwisho wa 2027?",
      am: "ያለጊዜው ምርጫ እስከ 2027 መጨረሻ ይጠራል?",
    },
    description: {
      en: "If presidential or parliamentary early elections are officially announced by end of 2027, resolves YES. Erdogan's term expires in 2028.",
      es: "Si se anuncian oficialmente elecciones presidenciales o parlamentarias anticipadas antes de finales de 2027, se resuelve SÍ.",
      fr: "Si des élections présidentielles ou législatives anticipées sont officiellement annoncées d'ici fin 2027, résolu OUI.",
      de: "Wenn bis Ende 2027 offiziell vorgezogene Präsidentschafts- oder Parlamentswahlen angekündigt werden, wird JA aufgelöst.",
      ar: "إذا أُعلنت انتخابات رئاسية أو برلمانية مبكرة رسميًا بنهاية 2027، تكون الإجابة نعم.",
      pt: "Se eleições presidenciais ou parlamentares antecipadas forem oficialmente anunciadas até o final de 2027, resolve SIM.",
      rw: "Niba amatora y'umukuru w'igihugu cyangwa inteko mbere y'igihe atangazwa by'amategeko mbere y'impera za 2027, igisubizo ni YEGO.",
      sw: "Ikiwa uchaguzi wa rais au bunge wa mapema utatangazwa rasmi kabla ya mwisho wa 2027, jibu ni NDIYO.",
      am: "የፕሬዚዳንታዊ ወይም የፓርላማ ያለጊዜው ምርጫ እስከ 2027 መጨረሻ በይፋ ከተገለጸ አዎ ይፈታል።",
    },
  },
  // 7: ABD-Iran ateskes
  {
    title: {
      en: "Will the US-Iran war end with a ceasefire by end of April?",
      es: "¿La guerra entre EE.UU. e Irán terminará con un alto el fuego a finales de abril?",
      fr: "La guerre USA-Iran se terminera-t-elle par un cessez-le-feu fin avril ?",
      de: "Wird der US-Iran-Krieg bis Ende April mit einem Waffenstillstand enden?",
      ar: "هل ستنتهي الحرب الأمريكية الإيرانية بوقف إطلاق النار بنهاية أبريل؟",
      pt: "A guerra EUA-Irã terminará com um cessar-fogo até o final de abril?",
      rw: "Intambara ya Amerika-Iran izarangira n'amahoro mbere y'impera za Mata?",
      sw: "Je, vita vya Marekani-Iran vitaisha na kusitisha mapigano mwishoni mwa Aprili?",
      am: "የUS-ኢራን ጦርነት እስከ ሚያዝያ መጨረሻ በእርቅ ያበቃል?",
    },
    description: {
      en: "If an official ceasefire is declared between the US/Israel and Iran, resolves YES. The war started February 28. Trump says 'it will end soon' but Iran's conditions are tough.",
      es: "Si se declara un alto el fuego oficial entre EE.UU./Israel e Irán, se resuelve SÍ.",
      fr: "Si un cessez-le-feu officiel est déclaré entre les USA/Israël et l'Iran, résolu OUI.",
      de: "Wenn ein offizieller Waffenstillstand zwischen den USA/Israel und dem Iran erklärt wird, wird JA aufgelöst.",
      ar: "إذا أُعلن وقف إطلاق نار رسمي بين أمريكا/إسرائيل وإيران، تكون الإجابة نعم.",
      pt: "Se um cessar-fogo oficial for declarado entre os EUA/Israel e o Irã, resolve SIM.",
      rw: "Niba amahoro yemewe atangazwa hagati ya Amerika/Israeli na Iran, igisubizo ni YEGO.",
      sw: "Ikiwa kusitisha mapigano rasmi kutatangazwa kati ya Marekani/Israeli na Iran, jibu ni NDIYO.",
      am: "በUS/እስራኤል እና ኢራን መካከል ኦፊሴላዊ እርቅ ከተገለጸ አዎ ይፈታል።",
    },
  },
  // 8: NATO Ankara
  {
    title: {
      en: "Will the NATO Ankara Summit take place in July as planned?",
      es: "¿La Cumbre de la OTAN en Ankara se celebrará en julio según lo previsto?",
      fr: "Le Sommet OTAN d'Ankara aura-t-il lieu en juillet comme prévu ?",
      de: "Findet der NATO-Gipfel in Ankara wie geplant im Juli statt?",
      ar: "هل ستنعقد قمة الناتو في أنقرة في يوليو كما هو مخطط؟",
      pt: "A Cúpula da OTAN em Ancara acontecerá em julho conforme planejado?",
      rw: "Inama ya NATO i Ankara izabera muri Nyakanga nk'uko byateganyijwe?",
      sw: "Je, Mkutano wa NATO Ankara utafanyika Julai kama ilivyopangwa?",
      am: "የNATO አንካራ ጉባኤ በታቀደው መሰረት በጁላይ ይካሄዳል?",
    },
    description: {
      en: "If the 2026 NATO Leaders Summit takes place at Ankara Bestepe on July 7-8 as planned, resolves YES. There is risk of postponement due to the Iran war.",
      es: "Si la Cumbre de Líderes de la OTAN 2026 se celebra en Ankara Bestepe el 7-8 de julio según lo previsto, se resuelve SÍ.",
      fr: "Si le Sommet des dirigeants de l'OTAN 2026 a lieu à Ankara Bestepe les 7-8 juillet comme prévu, résolu OUI.",
      de: "Wenn der NATO-Gipfel 2026 wie geplant am 7.-8. Juli in Ankara Bestepe stattfindet, wird JA aufgelöst.",
      ar: "إذا عُقدت قمة قادة الناتو 2026 في أنقرة بشتبه في 7-8 يوليو كما هو مخطط، تكون الإجابة نعم.",
      pt: "Se a Cúpula de Líderes da OTAN 2026 acontecer em Ancara Bestepe em 7-8 de julho conforme planejado, resolve SIM.",
      rw: "Niba inama ya NATO 2026 ibera i Ankara Bestepe ku ya 7-8 Nyakanga nk'uko byateganyijwe, igisubizo ni YEGO.",
      sw: "Ikiwa Mkutano wa Viongozi wa NATO 2026 utafanyika Ankara Bestepe Julai 7-8 kama ilivyopangwa, jibu ni NDIYO.",
      am: "የ2026 NATO መሪዎች ጉባኤ በታቀደው መሰረት በአንካራ ቤሽቴፔ ጁላይ 7-8 ከተካሄደ አዎ ይፈታል።",
    },
  },
  // 9: Trump impeachment
  {
    title: {
      en: "Will Trump be impeached by end of 2026?",
      es: "¿Trump será sometido a juicio político antes de finales de 2026?",
      fr: "Trump sera-t-il destitué d'ici fin 2026 ?",
      de: "Wird Trump bis Ende 2026 angeklagt (Impeachment)?",
      ar: "هل سيتم عزل ترامب بنهاية 2026؟",
      pt: "Trump sofrerá impeachment até o final de 2026?",
      rw: "Trump azakurwa ku butegetsi mbere y'impera za 2026?",
      sw: "Je, Trump atashtakiwa kabla ya mwisho wa 2026?",
      am: "ትራምፕ እስከ 2026 መጨረሻ ይከሰሳል?",
    },
    description: {
      en: "If the US House of Representatives holds a formal impeachment vote against Trump within 2026, resolves YES. Currently at 14% on Polymarket.",
      es: "Si la Cámara de Representantes de EE.UU. realiza una votación formal de juicio político contra Trump en 2026, se resuelve SÍ.",
      fr: "Si la Chambre des représentants américaine tient un vote formel de destitution contre Trump en 2026, résolu OUI.",
      de: "Wenn das US-Repräsentantenhaus 2026 eine formelle Impeachment-Abstimmung gegen Trump abhält, wird JA aufgelöst.",
      ar: "إذا أجرى مجلس النواب الأمريكي تصويتًا رسميًا لعزل ترامب خلال 2026، تكون الإجابة نعم.",
      pt: "Se a Câmara dos Representantes dos EUA realizar uma votação formal de impeachment contra Trump em 2026, resolve SIM.",
      rw: "Niba Inteko ya Amerika itora by'amategeko yo gukura Trump ku butegetsi mu 2026, igisubizo ni YEGO.",
      sw: "Ikiwa Bunge la Marekani litafanya kura rasmi ya kumushtaki Trump ndani ya 2026, jibu ni NDIYO.",
      am: "የUS የተወካዮች ምክር ቤት በ2026 ውስጥ በትራምፕ ላይ ኦፊሴላዊ ክስ ድምጽ ከሰጠ አዎ ይፈታል።",
    },
  },
  // 10: TOGG
  {
    title: {
      en: "Will TOGG produce 60,000 vehicles in 2026?",
      es: "¿TOGG producirá 60.000 vehículos en 2026?",
      fr: "TOGG produira-t-il 60 000 véhicules en 2026 ?",
      de: "Wird TOGG 2026 60.000 Fahrzeuge produzieren?",
      ar: "هل ستنتج TOGG 60,000 سيارة في 2026؟",
      pt: "A TOGG produzirá 60.000 veículos em 2026?",
      rw: "TOGG izakora imodoka 60,000 mu 2026?",
      sw: "Je, TOGG itatengeneza magari 60,000 mwaka 2026?",
      am: "TOGG በ2026 60,000 ተሽከርካሪዎች ያመርታል?",
    },
    description: {
      en: "If TOGG's official 2026 total production reaches 60,000 or more, resolves YES. ~40,000 were produced in 2025, official target is 60,000+.",
      es: "Si la producción total oficial de TOGG en 2026 alcanza 60.000 o más, se resuelve SÍ.",
      fr: "Si la production totale officielle de TOGG en 2026 atteint 60 000 ou plus, résolu OUI.",
      de: "Wenn die offizielle Gesamtproduktion von TOGG 2026 60.000 oder mehr erreicht, wird JA aufgelöst.",
      ar: "إذا وصل إجمالي إنتاج TOGG الرسمي لعام 2026 إلى 60,000 أو أكثر، تكون الإجابة نعم.",
      pt: "Se a produção total oficial da TOGG em 2026 atingir 60.000 ou mais, resolve SIM.",
      rw: "Niba umusaruro wose w'amategeko wa TOGG mu 2026 ugeze kuri 60,000 cyangwa hejuru, igisubizo ni YEGO.",
      sw: "Ikiwa uzalishaji rasmi wa TOGG 2026 utafikia 60,000 au zaidi, jibu ni NDIYO.",
      am: "የTOGG ኦፊሴላዊ 2026 ጠቅላላ ምርት 60,000 ወይም ከዚያ በላይ ከደረሰ አዎ ይፈታል።",
    },
  },
  // 11: AI model
  {
    title: {
      en: "Will Anthropic have the #1 AI model at end of 2026?",
      es: "¿Anthropic tendrá el modelo de IA #1 a finales de 2026?",
      fr: "Anthropic aura-t-il le modèle IA n°1 fin 2026 ?",
      de: "Wird Anthropic Ende 2026 das beste KI-Modell haben?",
      ar: "هل سيكون لدى Anthropic أفضل نموذج ذكاء اصطناعي نهاية 2026؟",
      pt: "A Anthropic terá o modelo de IA nº 1 no final de 2026?",
      rw: "Anthropic izagira modeli ya AI nziza mu mpera za 2026?",
      sw: "Je, Anthropic itakuwa na modeli ya AI #1 mwishoni mwa 2026?",
      am: "Anthropic በ2026 መጨረሻ #1 AI ሞዴል ይኖረዋል?",
    },
    description: {
      en: "If an Anthropic model (Claude) is #1 on LMSys Arena rankings as of December 31, 2026, resolves YES. Currently Claude Opus 4.6 is first, Gemini 3.1 Pro is 4 Elo points behind.",
      es: "Si un modelo de Anthropic (Claude) es #1 en el ranking de LMSys Arena al 31 de diciembre de 2026, se resuelve SÍ.",
      fr: "Si un modèle Anthropic (Claude) est n°1 au classement LMSys Arena au 31 décembre 2026, résolu OUI.",
      de: "Wenn ein Anthropic-Modell (Claude) am 31. Dezember 2026 auf Platz 1 der LMSys Arena-Rangliste steht, wird JA aufgelöst.",
      ar: "إذا كان نموذج Anthropic (Claude) في المرتبة الأولى على تصنيف LMSys Arena في 31 ديسمبر 2026، تكون الإجابة نعم.",
      pt: "Se um modelo da Anthropic (Claude) estiver em 1º no ranking LMSys Arena em 31 de dezembro de 2026, resolve SIM.",
      rw: "Niba modeli ya Anthropic (Claude) iri ku mwanya wa 1 mu isuzuma rya LMSys Arena ku ya 31 Ukuboza 2026, igisubizo ni YEGO.",
      sw: "Ikiwa modeli ya Anthropic (Claude) iko #1 kwenye orodha ya LMSys Arena kufikia Desemba 31, 2026, jibu ni NDIYO.",
      am: "የAnthropic ሞዴል (Claude) በ2026 ዲሴምበር 31 በLMSys Arena ደረጃ #1 ከሆነ አዎ ይፈታል።",
    },
  },
  // 12: Bitcoin
  {
    title: {
      en: "Will Bitcoin be above $100,000 at end of 2026?",
      es: "¿Bitcoin estará por encima de $100.000 a finales de 2026?",
      fr: "Le Bitcoin sera-t-il au-dessus de 100 000 $ fin 2026 ?",
      de: "Wird Bitcoin Ende 2026 über 100.000 $ liegen?",
      ar: "هل سيكون سعر البيتكوين فوق 100,000 دولار نهاية 2026؟",
      pt: "O Bitcoin estará acima de $100.000 no final de 2026?",
      rw: "Bitcoin izaba hejuru ya $100,000 mu mpera za 2026?",
      sw: "Je, Bitcoin itakuwa juu ya $100,000 mwishoni mwa 2026?",
      am: "Bitcoin በ2026 መጨረሻ ከ$100,000 በላይ ይሆናል?",
    },
    description: {
      en: "If BTC is $100,000 or above per CoinMarketCap at close on December 31, 2026, resolves YES. Currently in the $65K-73K range, the Iran war has hit markets.",
      es: "Si BTC es $100.000 o más según CoinMarketCap al cierre del 31 de diciembre de 2026, se resuelve SÍ.",
      fr: "Si le BTC est à 100 000 $ ou plus selon CoinMarketCap à la clôture du 31 décembre 2026, résolu OUI.",
      de: "Wenn BTC laut CoinMarketCap am 31. Dezember 2026 bei 100.000 $ oder darüber schließt, wird JA aufgelöst.",
      ar: "إذا كان سعر البيتكوين 100,000 دولار أو أعلى وفقًا لـ CoinMarketCap في 31 ديسمبر 2026، تكون الإجابة نعم.",
      pt: "Se o BTC estiver em $100.000 ou mais no CoinMarketCap no fechamento de 31 de dezembro de 2026, resolve SIM.",
      rw: "Niba BTC iri $100,000 cyangwa hejuru kuri CoinMarketCap ku ya 31 Ukuboza 2026, igisubizo ni YEGO.",
      sw: "Ikiwa BTC ni $100,000 au zaidi kwenye CoinMarketCap wakati wa kufunga Desemba 31, 2026, jibu ni NDIYO.",
      am: "BTC በ2026 ዲሴምበር 31 መዝጊያ ላይ በCoinMarketCap $100,000 ወይም ከዚያ በላይ ከሆነ አዎ ይፈታል።",
    },
  },
  // 13: Hormuz Bogazi
  {
    title: {
      en: "Will the Strait of Hormuz reopen to commercial ships by end of April?",
      es: "¿El Estrecho de Ormuz se reabrirá al tráfico comercial a finales de abril?",
      fr: "Le détroit d'Ormuz rouvrira-t-il au trafic commercial fin avril ?",
      de: "Wird die Straße von Hormus bis Ende April für Handelsschiffe wieder geöffnet?",
      ar: "هل سيُعاد فتح مضيق هرمز أمام السفن التجارية بنهاية أبريل؟",
      pt: "O Estreito de Ormuz reabrirá para navios comerciais até o final de abril?",
      rw: "Umuhanda wa Hormuz uzafungurirwa amato y'ubucuruzi mbere y'impera za Mata?",
      sw: "Je, Mlango wa Hormuz utafunguliwa kwa meli za biashara kabla ya mwisho wa Aprili?",
      am: "የሆርሙዝ ባህር ለንግድ መርከቦች እስከ ሚያዝያ መጨረሻ ይከፈታል?",
    },
    description: {
      en: "If commercial tanker traffic through the Strait of Hormuz returns to pre-war levels by end of April 2026, resolves YES. Iran's Revolutionary Guards closed the strait.",
      es: "Si el tráfico de petroleros comerciales por el Estrecho de Ormuz vuelve a niveles prebélicos antes de finales de abril 2026, se resuelve SÍ.",
      fr: "Si le trafic de pétroliers commerciaux dans le détroit d'Ormuz revient aux niveaux d'avant-guerre d'ici fin avril 2026, résolu OUI.",
      de: "Wenn der kommerzielle Tankerverkehr durch die Straße von Hormus bis Ende April 2026 auf Vorkriegsniveau zurückkehrt, wird JA aufgelöst.",
      ar: "إذا عاد حركة الناقلات التجارية عبر مضيق هرمز إلى مستويات ما قبل الحرب بنهاية أبريل 2026، تكون الإجابة نعم.",
      pt: "Se o tráfego de petroleiros comerciais pelo Estreito de Ormuz retornar aos níveis pré-guerra até o final de abril de 2026, resolve SIM.",
      rw: "Niba ubucuruzi bw'amato binyuze mu muhanda wa Hormuz bugarutse ku rwego rwo mbere y'intambara mbere y'impera za Mata 2026, igisubizo ni YEGO.",
      sw: "Ikiwa trafiki ya meli za biashara kupitia Mlango wa Hormuz itarudi viwango vya kabla ya vita mwishoni mwa Aprili 2026, jibu ni NDIYO.",
      am: "በሆርሙዝ ባህር ውስጥ የንግድ ታንከር ትራፊክ እስከ 2026 ሚያዝያ መጨረሻ ከጦርነቱ በፊት ወደነበረው ደረጃ ከተመለሰ አዎ ይፈታል።",
    },
  },
  // 14: Istanbul deprem
  {
    title: {
      en: "Will a 7+ magnitude earthquake hit Istanbul in 2026?",
      es: "¿Un terremoto de magnitud 7+ golpeará Estambul en 2026?",
      fr: "Un séisme de magnitude 7+ frappera-t-il Istanbul en 2026 ?",
      de: "Wird 2026 ein Erdbeben der Stärke 7+ Istanbul treffen?",
      ar: "هل سيضرب زلزال بقوة 7+ إسطنبول في 2026؟",
      pt: "Um terremoto de magnitude 7+ atingirá Istambul em 2026?",
      rw: "Umutingito wa 7+ uzakubita Istanbul mu 2026?",
      sw: "Je, tetemeko la ardhi la ukubwa 7+ litapiga Istanbul mwaka 2026?",
      am: "በ2026 7+ ጥንካሬ ያለው የመሬት መንቀጥቀጥ ኢስታንቡልን ይመታል?",
    },
    description: {
      en: "If AFAD or USGS records a 7.0+ magnitude earthquake within 100km of Istanbul in 2026, resolves YES.",
      es: "Si AFAD o USGS registran un terremoto de magnitud 7.0+ dentro de 100 km de Estambul en 2026, se resuelve SÍ.",
      fr: "Si l'AFAD ou l'USGS enregistre un séisme de magnitude 7.0+ dans un rayon de 100 km d'Istanbul en 2026, résolu OUI.",
      de: "Wenn AFAD oder USGS 2026 ein Erdbeben der Stärke 7,0+ im Umkreis von 100 km um Istanbul verzeichnet, wird JA aufgelöst.",
      ar: "إذا سجلت AFAD أو USGS زلزالًا بقوة 7.0+ ضمن 100 كم من إسطنبول في 2026، تكون الإجابة نعم.",
      pt: "Se AFAD ou USGS registrar um terremoto de magnitude 7.0+ dentro de 100 km de Istambul em 2026, resolve SIM.",
      rw: "Niba AFAD cyangwa USGS yandika umutingito wa 7.0+ mu ntera ya km 100 y'Istanbul mu 2026, igisubizo ni YEGO.",
      sw: "Ikiwa AFAD au USGS itarekodi tetemeko la ardhi la ukubwa 7.0+ ndani ya km 100 ya Istanbul mwaka 2026, jibu ni NDIYO.",
      am: "AFAD ወይም USGS በ2026 ከኢስታንቡል 100 ኪሜ ርቀት ውስጥ 7.0+ ጥንካሬ ያለው የመሬት መንቀጥቀጥ ከመዘገበ አዎ ይፈታል።",
    },
  },
];

async function main() {
  console.log("Seeding pusulam database...");

  // Clean existing data
  await prisma.commentVote.deleteMany();
  await prisma.prediction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.position.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.market.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("test123", 10);

  // Users
  const admin = await prisma.user.create({
    data: {
      email: "admin@pusulam.ai",
      username: "admin",
      displayName: "Pusulam Admin",
      passwordHash: hash,
      balance: 10000,
      reputation: 95,
      role: "ADMIN",
    },
  });

  const emre = await prisma.user.create({
    data: {
      email: "emre@pusulam.ai",
      username: "emrevarol",
      displayName: "Emre Varol",
      passwordHash: hash,
      balance: 5000,
      reputation: 82,
      role: "PRO",
      bio: "Kolektif zeka meraklisi",
    },
  });

  const ali = await prisma.user.create({
    data: {
      email: "ali@test.com",
      username: "alioz",
      displayName: "Ali Ozsoy",
      passwordHash: hash,
      balance: 3000,
      reputation: 45,
    },
  });

  const zeynep = await prisma.user.create({
    data: {
      email: "zeynep@test.com",
      username: "zeynepk",
      displayName: "Zeynep Kaya",
      passwordHash: hash,
      balance: 4200,
      reputation: 67,
    },
  });

  const mehmet = await prisma.user.create({
    data: {
      email: "mehmet@test.com",
      username: "mehmetd",
      displayName: "Mehmet Demir",
      passwordHash: hash,
      balance: 1800,
      reputation: 33,
    },
  });

  // Badges
  const badges = await Promise.all([
    prisma.badge.create({
      data: { name: "Ilk Tahmin", description: "Ilk tahminini yaptin!", icon: "🎯", tier: "BRONZE", requirement: '{"type":"trade_count","value":1}' },
    }),
    prisma.badge.create({
      data: { name: "Tahminci", description: "10 tahmin yaptin", icon: "📊", tier: "SILVER", requirement: '{"type":"trade_count","value":10}' },
    }),
    prisma.badge.create({
      data: { name: "Uzman Tahminci", description: "50 tahmin yaptin", icon: "🧠", tier: "GOLD", requirement: '{"type":"trade_count","value":50}' },
    }),
    prisma.badge.create({
      data: { name: "Kalibrasyon Ustasi", description: "Kalibrasyon skorun 80+", icon: "🎯", tier: "PLATINUM", requirement: '{"type":"reputation","value":80}' },
    }),
    prisma.badge.create({
      data: { name: "Piyasa Kurucusu", description: "Ilk piyasani olusturdun", icon: "🏗️", tier: "BRONZE", requirement: '{"type":"market_created","value":1}' },
    }),
    prisma.badge.create({
      data: { name: "7 Gunluk Seri", description: "7 gun ust uste tahmin yaptin", icon: "🔥", tier: "SILVER", requirement: '{"type":"streak","value":7}' },
    }),
  ]);

  await prisma.userBadge.createMany({
    data: [
      { userId: emre.id, badgeId: badges[0].id },
      { userId: emre.id, badgeId: badges[1].id },
      { userId: emre.id, badgeId: badges[3].id },
      { userId: ali.id, badgeId: badges[0].id },
      { userId: zeynep.id, badgeId: badges[0].id },
      { userId: zeynep.id, badgeId: badges[1].id },
    ],
  });

  // ============================================================
  // MARKETS — Real events with 9-language translations
  // ============================================================

  const marketData = [
    { title: "Dolar/TL Haziran 2026 sonunda 46 TL'yi gecer mi?", description: "TCMB resmi kuru baz alinacaktir. 30 Haziran 2026 gun sonu kapanisinda USD/TRY 46.00 ve uzerindeyse EVET. Su an ~44 TL, Iran savasi ve petrol fiyatlari TL uzerinde ek baski yaratiyor.", category: "EKONOMI", slug: "dolar-tl-haziran-2026-46-gecer-mi", resolutionDate: new Date("2026-06-30"), ...pools(0.55), volume: 12400, traderCount: 234, featured: true, createdById: admin.id },
    { title: "TCMB Nisan 2026'da faiz indirimine ara verir mi?", description: "TCMB PPK Nisan 2026 toplantisinda politika faizini sabit tutarsa EVET. Faiz su an %37, ardisik indirimler yapildi ama Iran savasi kaynakli petrol soku duraklatabilir.", category: "EKONOMI", slug: "tcmb-nisan-2026-faiz-indirimi-ara", resolutionDate: new Date("2026-04-30"), ...pools(0.45), volume: 8900, traderCount: 178, featured: true, createdById: admin.id },
    { title: "Brent petrol Mart sonu $100/varil uzerinde kalir mi?", description: "Brent ham petrol vadeli fiyati 31 Mart 2026 kapanisinda $100/varil ve uzerindeyse EVET. Iran savasi nedeniyle Hormuz Bogazi kapandi, fiyatlar $70'ten $119'a firladi.", category: "EKONOMI", slug: "brent-petrol-mart-2026-100-dolar", resolutionDate: new Date("2026-03-31"), ...pools(0.40), volume: 15600, traderCount: 312, createdById: emre.id },
    { title: "Turkiye Mart 2026 yillik enflasyonu %35'i gecer mi?", description: "TUIK Mart 2026 yillik TUFE verisi %35.00 ve uzerindeyse EVET. Subat'ta %31.53 aciklandi, petrol fiyatlari ek baski yaratabilir.", category: "EKONOMI", slug: "turkiye-mart-2026-enflasyon-35", resolutionDate: new Date("2026-04-05"), ...pools(0.35), volume: 6200, traderCount: 145, createdById: ali.id },
    { title: "Imamoglu davasi 2026 sonuna kadar karara baglanir mi?", description: "IBB Baskani Ekrem Imamoglu'nun 9 Mart 2026'da baslayan yolsuzluk davasinda 2026 yili icinde karar cikarsa EVET. 400 sanikli dava, 3900 sayfalik iddianame.", category: "SIYASET", slug: "imamoglu-davasi-2026-karar", resolutionDate: new Date("2026-12-31"), ...pools(0.15), volume: 18900, traderCount: 456, featured: true, createdById: admin.id },
    { title: "15 yas alti sosyal medya yasagi 2026'da yasalasir mi?", description: "AKP'nin 4 Mart'ta TBMM'ye sundugu 15 yas alti sosyal medya yasagi tasarisi 2026 yili icinde yasalasirsa EVET.", category: "SIYASET", slug: "sosyal-medya-yasagi-15-yas-2026", resolutionDate: new Date("2026-12-31"), ...pools(0.72), volume: 5400, traderCount: 98, createdById: zeynep.id },
    { title: "2027 sonuna kadar erken secim ilan edilir mi?", description: "Cumhurbaskanligi veya milletvekili erken secimi 2027 sonuna kadar resmi olarak ilan edilirse EVET. Erdogan'in gorev suresi 2028'de doluyor.", category: "SIYASET", slug: "erken-secim-2027-sonuna-kadar", resolutionDate: new Date("2027-12-31"), ...pools(0.25), volume: 22100, traderCount: 534, createdById: admin.id },
    { title: "ABD-Iran savasi Nisan sonuna kadar ateskes ile biter mi?", description: "ABD/Israil ve Iran arasinda resmi ateskes ilan edilirse EVET. Savas 28 Subat'ta basladi. Trump 'yakinda biter' diyor, Iran sartlari agir.", category: "DUNYA", slug: "abd-iran-ateskes-nisan-2026", resolutionDate: new Date("2026-04-30"), ...pools(0.50), volume: 34200, traderCount: 789, featured: true, createdById: admin.id },
    { title: "NATO Ankara Zirvesi Temmuz'da planlandigi gibi yapilir mi?", description: "2026 NATO Liderler Zirvesi Ankara Bestepe'de 7-8 Temmuz'da planlandigi sekilde yapilirsa EVET. Iran savasi nedeniyle ertelenme riski var.", category: "DUNYA", slug: "nato-ankara-zirvesi-temmuz-2026", resolutionDate: new Date("2026-07-10"), ...pools(0.82), volume: 4800, traderCount: 67, createdById: emre.id },
    { title: "Trump 2026 sonuna kadar gorevden alinir mi?", description: "ABD Temsilciler Meclisi 2026 icinde Trump'a resmi azil (impeachment) oylamasi yaparsa EVET. Polymarket'ta su an %14.", category: "DUNYA", slug: "trump-impeachment-2026", resolutionDate: new Date("2026-12-31"), ...pools(0.14), volume: 28500, traderCount: 621, createdById: admin.id },
    { title: "TOGG 2026'da 60.000 arac uretir mi?", description: "TOGG'un resmi aciklamasina gore 2026 toplam uretimi 60.000 ve uzerindeyse EVET. 2025'te ~40.000 uretildi, resmi hedef 60.000+.", category: "TEKNOLOJI", slug: "togg-2026-60bin-uretim", resolutionDate: new Date("2027-01-15"), ...pools(0.58), volume: 7600, traderCount: 134, createdById: emre.id },
    { title: "2026 sonunda en iyi AI modeli Anthropic'in mi olur?", description: "LMSys Arena siralamasinda 31 Aralik 2026 itibariyle 1. sirada Anthropic modeli (Claude) varsa EVET. Su an Claude Opus 4.6 birinci, Gemini 3.1 Pro 4 Elo farkla yaklasti.", category: "TEKNOLOJI", slug: "en-iyi-ai-modeli-2026-anthropic", resolutionDate: new Date("2026-12-31"), ...pools(0.38), volume: 9300, traderCount: 187, createdById: ali.id },
    { title: "Bitcoin 2026 sonunda $100.000 uzerinde olur mu?", description: "CoinMarketCap verisine gore 31 Aralik 2026 kapanisinda BTC $100,000 ve uzerindeyse EVET. Su an $65K-73K bandinda, Iran savasi piyasalari vurdu.", category: "TEKNOLOJI", slug: "bitcoin-2026-100bin-dolar", resolutionDate: new Date("2026-12-31"), ...pools(0.52), volume: 41200, traderCount: 912, createdById: admin.id },
    { title: "Hormuz Bogazi Nisan sonuna kadar ticari gemilere acilir mi?", description: "Iran Devrim Muhafizlari Hormuz Bogazi'ni kapatti. Nisan 2026 sonuna kadar ticari tanker trafigi savas oncesi seviyeye donerse EVET.", category: "GUNDEM", slug: "hormuz-bogazi-nisan-2026-acilir-mi", resolutionDate: new Date("2026-04-30"), ...pools(0.35), volume: 19800, traderCount: 423, featured: true, createdById: admin.id },
    { title: "Istanbul'da 2026'da 7+ buyuklugunde deprem olur mu?", description: "AFAD veya USGS verisine gore Istanbul 100km yaricapta 7.0+ buyuklukte deprem kaydedilirse EVET.", category: "GUNDEM", slug: "istanbul-deprem-2026-7-buyukluk", resolutionDate: new Date("2026-12-31"), ...pools(0.08), volume: 14300, traderCount: 367, createdById: admin.id },
  ];

  const markets = await Promise.all(
    marketData.map((data, i) =>
      prisma.market.create({
        data: {
          ...data,
          titleTranslations: marketTranslations[i].title,
          descriptionTranslations: marketTranslations[i].description,
        },
      })
    )
  );

  // Sample trades and positions
  await prisma.trade.createMany({
    data: [
      { direction: "BUY", side: "YES", shares: 50, price: 0.55, cost: 27.5, userId: emre.id, marketId: markets[0].id },
      { direction: "BUY", side: "NO", shares: 30, price: 0.45, cost: 13.5, userId: ali.id, marketId: markets[0].id },
      { direction: "BUY", side: "YES", shares: 80, price: 0.50, cost: 40, userId: zeynep.id, marketId: markets[7].id },
      { direction: "BUY", side: "YES", shares: 40, price: 0.15, cost: 6, userId: mehmet.id, marketId: markets[4].id },
      { direction: "BUY", side: "NO", shares: 60, price: 0.85, cost: 51, userId: emre.id, marketId: markets[4].id },
      { direction: "BUY", side: "YES", shares: 100, price: 0.52, cost: 52, userId: emre.id, marketId: markets[12].id },
      { direction: "BUY", side: "NO", shares: 45, price: 0.48, cost: 21.6, userId: ali.id, marketId: markets[12].id },
    ],
  });

  await prisma.position.createMany({
    data: [
      { side: "YES", shares: 50, avgPrice: 0.55, userId: emre.id, marketId: markets[0].id },
      { side: "NO", shares: 30, avgPrice: 0.45, userId: ali.id, marketId: markets[0].id },
      { side: "YES", shares: 80, avgPrice: 0.50, userId: zeynep.id, marketId: markets[7].id },
      { side: "YES", shares: 40, avgPrice: 0.15, userId: mehmet.id, marketId: markets[4].id },
      { side: "NO", shares: 60, avgPrice: 0.85, userId: emre.id, marketId: markets[4].id },
      { side: "YES", shares: 100, avgPrice: 0.52, userId: emre.id, marketId: markets[12].id },
      { side: "NO", shares: 45, avgPrice: 0.48, userId: ali.id, marketId: markets[12].id },
    ],
  });

  // Predictions with reasoning
  await prisma.prediction.createMany({
    data: [
      { probability: 0.62, reasoning: "Cari acik buyuyor, petrol soku TL'ye ekstra baski yapiyor. Haziran'a kadar 46'yi goruruz.", userId: emre.id, marketId: markets[0].id },
      { probability: 0.40, reasoning: "TCMB siki durusa devam ederse carry trade TL'yi destekler. 46 zor.", userId: ali.id, marketId: markets[0].id },
      { probability: 0.55, reasoning: "Ateskes olmadan Hormuz acilmaz. Iki taraf da geri adim atmiyor.", userId: zeynep.id, marketId: markets[7].id },
      { probability: 0.12, reasoning: "400 sanikli dava 1 yilda bitmez. Turk yargi sistemi bu kadar hizli calismiyor.", userId: mehmet.id, marketId: markets[4].id },
      { probability: 0.60, reasoning: "Halving etkisi 12-18 ay sonra hissedilir. 2024 halving'i 2026 sonunda 100K'yi getirir.", userId: emre.id, marketId: markets[12].id },
    ],
  });

  // Comments
  await prisma.comment.createMany({
    data: [
      { content: "Petrol 100'un uzerinde kaldikca dolar 46'yi gecer. Hormuz kapali oldukca bu kacinilmaz.", userId: ali.id, marketId: markets[0].id },
      { content: "TCMB surecinde cok sikilar. Petrol yukselirsa bile faiz indirimi duraklatamazlar, siyasi baski var.", userId: zeynep.id, marketId: markets[1].id },
      { content: "Iran savasi 2 haftadir suruyor, Trump 'yakinda biter' demesine ragmen hicbir somut adim yok.", userId: mehmet.id, marketId: markets[7].id },
      { content: "Imamoglu davasi siyasi motivasyonlu, bu kadar buyuk davada yillar alir.", userId: emre.id, marketId: markets[4].id },
      { content: "Bitcoin ETF akislari savastan bagimsiz devam ediyor. Kurumsal talep guclu.", userId: ali.id, marketId: markets[12].id },
      { content: "NATO zirvesi kesinlikle yapilir, Turkiye ev sahibi olarak iptal etmez. En fazla ajanda degisir.", userId: zeynep.id, marketId: markets[8].id },
    ],
  });

  console.log("Seed tamamlandi!");
  console.log(`  5 kullanici`);
  console.log(`  ${markets.length} piyasa (9 dilde cevirileriyle)`);
  console.log(`  ${badges.length} rozet`);
  console.log(`  Havuz likiditesi: 10.000 (smooth trading)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
