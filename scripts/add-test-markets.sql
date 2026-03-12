-- Add test markets with short deadlines for resolution testing
-- Run: psql -d pusulam -f scripts/add-test-markets.sql

DO $$
DECLARE
  admin_id TEXT;
BEGIN
  SELECT id INTO admin_id FROM "User" WHERE email='admin@pusulam.ai' LIMIT 1;

  -- 2 minutes from now
  INSERT INTO "Market" (id, title, slug, description, category, status, "yesPool", "noPool", volume, "traderCount", "resolutionDate", "createdById", "titleTranslations", "descriptionTranslations", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'Test: Bu piyasa 2 dakika icinde kapanacak',
    'test-2-dakika',
    'Bu bir test piyasasidir. 2 dakika icinde sonuclanacaktir.',
    'GUNDEM', 'OPEN', 5000, 5000, 0, 0,
    NOW() + INTERVAL '2 minutes',
    admin_id,
    '{"en": "Test: This market closes in 2 minutes", "de": "Test: Dieser Markt schließt in 2 Minuten", "es": "Test: Este mercado cierra en 2 minutos", "fr": "Test: Ce marché ferme dans 2 minutes", "ar": "اختبار: هذا السوق يغلق خلال دقيقتين", "pt": "Teste: Este mercado fecha em 2 minutos", "rw": "Ikizamini: Iri soko rizafunga mu minota 2", "sw": "Jaribio: Soko hili linafunga kwa dakika 2", "am": "ሙከራ: ይህ ገበያ በ2 ደቂቃ ውስጥ ይዘጋል"}'::jsonb,
    '{"en": "This is a test market for resolution workflow testing.", "de": "Dies ist ein Testmarkt.", "es": "Este es un mercado de prueba.", "fr": "Ceci est un marché test.", "ar": "هذا سوق اختبار.", "pt": "Este é um mercado de teste.", "rw": "Iri ni isoko ryikizamini.", "sw": "Hii ni soko la majaribio.", "am": "ይህ የሙከራ ገበያ ነው."}'::jsonb,
    NOW(), NOW()
  );

  -- 5 minutes from now
  INSERT INTO "Market" (id, title, slug, description, category, status, "yesPool", "noPool", volume, "traderCount", "resolutionDate", "createdById", "titleTranslations", "descriptionTranslations", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'Turkiye-Iran sinir kapisi yarin acilir mi?',
    'turkiye-iran-sinir-kapisi-test',
    'Iran sinir kapisi 24 saat icinde ticari araclara acilir mi? Test amacli kisa vadeli piyasa.',
    'DUNYA', 'OPEN', 4000, 6000, 500, 3,
    NOW() + INTERVAL '5 minutes',
    admin_id,
    '{"en": "Will Turkey-Iran border gate open tomorrow?", "de": "Wird das Grenztor Türkei-Iran morgen geöffnet?", "es": "¿Se abrirá la puerta fronteriza Turquía-Irán mañana?", "fr": "La frontière Turquie-Iran ouvrira-t-elle demain?", "ar": "هل سيفتح معبر تركيا-إيران الحدودي غدا؟", "pt": "O portão de fronteira Turquia-Irã abrirá amanhã?", "rw": "Umupaka wa Turukiya-Iran uzafunguka ejo?", "sw": "Je, lango la mpaka la Uturuki-Iran litafunguliwa kesho?", "am": "የቱርክ-ኢራን ድንበር በር ነገ ይከፈታል?"}'::jsonb,
    '{"en": "Short-term test market. Will Turkey-Iran border reopen for commercial vehicles within 24 hours?", "de": "Kurzfristiger Testmarkt.", "es": "Mercado de prueba a corto plazo.", "fr": "Marché test à court terme.", "ar": "سوق اختبار قصير المدى.", "pt": "Mercado de teste de curto prazo.", "rw": "Isoko ryikizamini ryigihe gito.", "sw": "Soko la majaribio la muda mfupi.", "am": "የአጭር ጊዜ ሙከራ ገበያ."}'::jsonb,
    NOW(), NOW()
  );

  -- 10 minutes from now
  INSERT INTO "Market" (id, title, slug, description, category, status, "yesPool", "noPool", volume, "traderCount", "resolutionDate", "createdById", "titleTranslations", "descriptionTranslations", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'BIST100 bugun yuzde 2 yukselir mi?',
    'bist100-bugun-yukselir-test',
    'BIST100 endeksi bugun kapanis saatinde acilisa gore yuzde 2 yukseliste olur mu?',
    'EKONOMI', 'OPEN', 6000, 4000, 1200, 5,
    NOW() + INTERVAL '10 minutes',
    admin_id,
    '{"en": "Will BIST100 rise 2% today?", "de": "Steigt der BIST100 heute um 2%?", "es": "¿Subirá el BIST100 un 2% hoy?", "fr": "Le BIST100 augmentera-t-il de 2% aujourd hui?", "ar": "هل سيرتفع BIST100 بنسبة 2% اليوم؟", "pt": "O BIST100 subirá 2% hoje?", "rw": "BIST100 izamuka 2% uyu munsi?", "sw": "Je, BIST100 itapanda 2% leo?", "am": "BIST100 ዛሬ 2% ይጨምራል?"}'::jsonb,
    '{"en": "Test market. Will BIST100 index close 2% higher than opening?", "de": "Testmarkt.", "es": "Mercado de prueba.", "fr": "Marché test.", "ar": "سوق اختبار.", "pt": "Mercado de teste.", "rw": "Isoko ryikizamini.", "sw": "Soko la majaribio.", "am": "የሙከራ ገበያ."}'::jsonb,
    NOW(), NOW()
  );

  -- 30 minutes from now
  INSERT INTO "Market" (id, title, slug, description, category, status, "yesPool", "noPool", volume, "traderCount", "resolutionDate", "createdById", "titleTranslations", "descriptionTranslations", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'Merkez Bankasi bugun aciklama yapar mi?',
    'merkez-bankasi-aciklama-test',
    'TCMB bugun saat 17:00 oncesinde herhangi bir faiz veya para politikasi aciklamasi yapar mi?',
    'EKONOMI', 'OPEN', 3000, 7000, 800, 4,
    NOW() + INTERVAL '30 minutes',
    admin_id,
    '{"en": "Will the Central Bank make a statement today?", "de": "Gibt die Zentralbank heute eine Erklärung ab?", "es": "¿Hará el Banco Central una declaración hoy?", "fr": "La Banque centrale fera-t-elle une déclaration aujourd hui?", "ar": "هل سيصدر البنك المركزي بيانا اليوم؟", "pt": "O Banco Central fará uma declaração hoje?", "rw": "Banki Nkuru izatanga itangazo uyu munsi?", "sw": "Je, Benki Kuu itatoa taarifa leo?", "am": "ማዕከላዊ ባንክ ዛሬ መግለጫ ይሰጣል?"}'::jsonb,
    '{"en": "Test market. Will TCMB release any statement today before 5pm?", "de": "Testmarkt.", "es": "Mercado de prueba.", "fr": "Marché test.", "ar": "سوق اختبار.", "pt": "Mercado de teste.", "rw": "Isoko ryikizamini.", "sw": "Soko la majaribio.", "am": "የሙከራ ገበያ."}'::jsonb,
    NOW(), NOW()
  );

  -- 1 hour from now
  INSERT INTO "Market" (id, title, slug, description, category, status, "yesPool", "noPool", volume, "traderCount", "resolutionDate", "createdById", "titleTranslations", "descriptionTranslations", "createdAt", "updatedAt")
  VALUES (
    gen_random_uuid()::text,
    'Altin bugun ons basina 3200 dolar ustunde kapanir mi?',
    'altin-3200-kapanis-test',
    'Altin spot fiyati bugun 3200 dolar/oz ustunde kapanir mi? Son fiyat: 3187 dolar.',
    'EKONOMI', 'OPEN', 5500, 4500, 2000, 8,
    NOW() + INTERVAL '1 hour',
    admin_id,
    '{"en": "Will gold close above $3,200/oz today?", "de": "Schließt Gold heute über $3.200/oz?", "es": "¿Cerrará el oro por encima de $3.200/oz hoy?", "fr": "L or cloturera-t-il au-dessus de 3 200$/oz aujourd hui?", "ar": "هل سيغلق الذهب فوق 3200 دولار/أونصة اليوم؟", "pt": "O ouro fechará acima de $3.200/oz hoje?", "rw": "Zahabu izafunga hejuru ya $3,200/oz uyu munsi?", "sw": "Je, dhahabu itafunga juu ya $3,200/oz leo?", "am": "ወርቅ ዛሬ ከ$3,200/oz በላይ ይዘጋል?"}'::jsonb,
    '{"en": "Test market. Gold spot price closing above $3,200 per ounce today.", "de": "Testmarkt. Goldspot-Preis.", "es": "Mercado de prueba. Precio spot del oro.", "fr": "Marché test. Prix spot de l or.", "ar": "سوق اختبار. سعر الذهب الفوري.", "pt": "Mercado de teste. Preço spot do ouro.", "rw": "Isoko ryikizamini. Igiciro cya zahabu.", "sw": "Soko la majaribio. Bei ya dhahabu.", "am": "የሙከራ ገበያ. የወርቅ ዋጋ."}'::jsonb,
    NOW(), NOW()
  );

  RAISE NOTICE 'Inserted 5 test markets with deadlines: 2min, 5min, 10min, 30min, 1hr from now';
END $$;
