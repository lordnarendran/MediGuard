/* ============================================================
   MEDIGUARD — content.js
   Content Library — seeds mg_content_library in localStorage
   with educational resources for the Sexual Health module.

   Schema per Content_Item:
     { id, title, category, tags, summary, content, relevanceScore }

   Tags MUST match the concern option values in the Sexual Health
   logging form exactly:
     "safe practices" | "communication" | "reproductive health"
     | "body image" | "stress impact"

   Merge rule: existing items with the same id are NOT duplicated.
   Items from other categories are NOT removed or overwritten.
   ============================================================ */

(function seedContentLibrary() {

  /** Sexual Health content items to seed */
  const SEXUAL_HEALTH_ITEMS = [
    {
      id:             'sh-content-001',
      title:          'Understanding Safe Practices in Sexual Health',
      category:       'Sexual Health',
      tags:           ['safe practices', 'reproductive health'],
      summary:        'An overview of evidence-based safe practices that reduce the risk of sexually transmitted infections and unintended pregnancy.',
      content:        'Safe practices in sexual health include consistent and correct use of barrier methods, regular STI screening, open communication with partners about health status, and access to contraception. Evidence shows that combining barrier methods with regular testing significantly reduces transmission risk. Reproductive health planning — including pre-conception counselling and contraceptive choice — is an integral part of long-term wellbeing.',
      relevanceScore: 0.92
    },
    {
      id:             'sh-content-002',
      title:          'Communication, Body Image, and Stress in Intimate Relationships',
      category:       'Sexual Health',
      tags:           ['communication', 'body image', 'stress impact'],
      summary:        'How open communication, positive body image, and stress management contribute to healthier intimate relationships and overall sexual wellbeing.',
      content:        'Effective communication between partners is consistently linked to higher relationship satisfaction and safer sexual behaviour. Body image concerns can affect intimacy and self-esteem; cognitive-behavioural approaches and mindfulness have shown benefit in clinical studies. Chronic stress activates the hypothalamic-pituitary-adrenal axis, suppressing libido and impairing sexual function. Stress-reduction strategies — including regular physical activity, sleep hygiene, and professional support — can meaningfully improve sexual health outcomes.',
      relevanceScore: 0.88
    }
  ];

  /* ── Merge into existing library ──────────────────────────── */
  let library = [];
  try {
    const raw = localStorage.getItem('mg_content_library');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) library = parsed;
    }
  } catch (e) {
    console.warn('[Content] Failed to read mg_content_library:', e);
  }

  // Build a set of existing IDs to avoid duplicates
  const existingIds = new Set(library.map(item => item && item.id).filter(Boolean));

  let added = 0;
  SEXUAL_HEALTH_ITEMS.forEach(item => {
    if (!existingIds.has(item.id)) {
      library.push(item);
      existingIds.add(item.id);
      added++;
    }
  });

  if (added > 0) {
    try {
      localStorage.setItem('mg_content_library', JSON.stringify(library));
      console.log(`[Content] Seeded ${added} Sexual Health item(s) into mg_content_library.`);
    } catch (e) {
      console.error('[Content] Failed to write mg_content_library:', e);
    }
  }

})();
