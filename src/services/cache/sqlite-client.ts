import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createChildLogger } from '../../utils/logger';

const logger = createChildLogger('SQLiteClient');

let db: Database.Database | null = null;

const SCHEMA_VERSION = 8;

const MIGRATIONS: Record<number, string[]> = {
  1: [
    // SERP results cache
    `CREATE TABLE IF NOT EXISTS serp_cache (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL,
      geo TEXT NOT NULL,
      results TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_serp_expires ON serp_cache(expires_at)`,
    `CREATE INDEX IF NOT EXISTS idx_serp_keyword_geo ON serp_cache(keyword, geo)`,

    // Scraped pages cache
    `CREATE TABLE IF NOT EXISTS page_cache (
      url TEXT PRIMARY KEY,
      title TEXT,
      content TEXT NOT NULL,
      word_count INTEGER,
      scraped_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_page_expires ON page_cache(expires_at)`,

    // Schema version tracking
    `CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    )`,
  ],
  2: [
    // Articles storage
    `CREATE TABLE IF NOT EXISTS articles (
      article_id TEXT PRIMARY KEY,
      outline_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      sections TEXT NOT NULL,
      metadata TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_articles_keyword ON articles(keyword)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)`,
  ],
  3: [
    // Add site column to articles
    `ALTER TABLE articles ADD COLUMN site TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_articles_site ON articles(site)`,
  ],
  4: [
    // Projects table
    `CREATE TABLE IF NOT EXISTS projects (
      project_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)`,
    // Add project_id column to articles
    `ALTER TABLE articles ADD COLUMN project_id TEXT REFERENCES projects(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_project_id ON articles(project_id)`,
  ],
  5: [
    // Toplist templates (seeded with defaults)
    `CREATE TABLE IF NOT EXISTS toplist_templates (
      template_id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      columns TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )`,

    // Global brand library
    `CREATE TABLE IF NOT EXISTS brands (
      brand_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      logo_url TEXT,
      website_url TEXT,
      attributes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug)`,
    `CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name)`,

    // Toplists (per-article, not reusable)
    `CREATE TABLE IF NOT EXISTS toplists (
      toplist_id TEXT PRIMARY KEY,
      article_id TEXT REFERENCES articles(article_id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      template_id TEXT REFERENCES toplist_templates(template_id),
      columns TEXT NOT NULL,
      position INTEGER NOT NULL,
      markdown_output TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_toplists_article ON toplists(article_id)`,

    // Brands in a toplist with position and overrides
    `CREATE TABLE IF NOT EXISTS toplist_entries (
      entry_id TEXT PRIMARY KEY,
      toplist_id TEXT NOT NULL REFERENCES toplists(toplist_id) ON DELETE CASCADE,
      brand_id TEXT NOT NULL REFERENCES brands(brand_id),
      rank INTEGER NOT NULL,
      attribute_overrides TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      UNIQUE(toplist_id, brand_id),
      UNIQUE(toplist_id, rank)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_toplist_entries_toplist ON toplist_entries(toplist_id)`,
  ],
  6: [
    // Add optional project metadata fields
    `ALTER TABLE projects ADD COLUMN geo TEXT`,
    `ALTER TABLE projects ADD COLUMN language TEXT`,
    `ALTER TABLE projects ADD COLUMN authors TEXT`, // JSON array of author names
    `ALTER TABLE projects ADD COLUMN default_toplist_ids TEXT`, // JSON array of toplist template IDs
  ],
  7: [
    // Translations table for column labels and other UI strings
    `CREATE TABLE IF NOT EXISTS translations (
      key TEXT NOT NULL,
      language TEXT NOT NULL,
      translation TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (key, language)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language)`,
  ],
  8: [
    // Content plan pages for site architecture import
    `CREATE TABLE IF NOT EXISTS content_plan_pages (
      page_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
      url TEXT,
      meta_title TEXT,
      meta_description TEXT,
      keywords TEXT,
      page_type TEXT,
      icon TEXT,
      level INTEGER,
      nav_i TEXT,
      nav_ii TEXT,
      nav_iii TEXT,
      description TEXT,
      notes TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      parent_page_id TEXT REFERENCES content_plan_pages(page_id) ON DELETE SET NULL,
      generation_status TEXT NOT NULL DEFAULT 'pending',
      article_id TEXT REFERENCES articles(article_id) ON DELETE SET NULL,
      error_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_content_plan_pages_project ON content_plan_pages(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_content_plan_pages_status ON content_plan_pages(generation_status)`,
    `CREATE INDEX IF NOT EXISTS idx_content_plan_pages_article ON content_plan_pages(article_id)`,
  ],
};

function ensureDataDirectory(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info({ dir }, 'Created data directory');
  }
}

function getCurrentVersion(database: Database.Database): number {
  try {
    const row = database.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined;
    return row?.version ?? 0;
  } catch {
    return 0;
  }
}

// Default toplist templates to seed
const DEFAULT_TOPLIST_TEMPLATES = [
  {
    template_id: 'casino-comparison',
    name: 'Casino Comparison',
    description: 'Full comparison table for online casinos with all key metrics',
    columns: JSON.stringify([
      { id: 'rank', label: '#', type: 'number', brandAttribute: '_rank' },
      { id: 'name', label: 'Casino', type: 'text', brandAttribute: 'name' },
      { id: 'license', label: 'License', type: 'text', brandAttribute: 'license' },
      { id: 'welcomeOffer', label: 'Welcome Offer', type: 'text', brandAttribute: 'welcomeOffer' },
      { id: 'wagering', label: 'Wagering', type: 'text', brandAttribute: 'wageringRequirement' },
      { id: 'withdrawalTime', label: 'Withdrawal', type: 'text', brandAttribute: 'withdrawalTime' },
      { id: 'paymentMethods', label: 'Payments', type: 'list', brandAttribute: 'paymentMethods' },
      { id: 'highlights', label: 'Highlights', type: 'list', brandAttribute: 'highlights' },
      { id: 'bestFor', label: 'Best For', type: 'text', brandAttribute: 'bestFor' },
      { id: 'score', label: 'Score', type: 'rating', brandAttribute: 'overallScore' },
    ]),
  },
  {
    template_id: 'sportsbook-comparison',
    name: 'Sportsbook Comparison',
    description: 'Comparison table for sports betting sites',
    columns: JSON.stringify([
      { id: 'rank', label: '#', type: 'number', brandAttribute: '_rank' },
      { id: 'name', label: 'Sportsbook', type: 'text', brandAttribute: 'name' },
      { id: 'license', label: 'License', type: 'text', brandAttribute: 'license' },
      { id: 'welcomeOffer', label: 'Welcome Offer', type: 'text', brandAttribute: 'welcomeOffer' },
      { id: 'odds', label: 'Odds Quality', type: 'text', brandAttribute: 'oddsQuality' },
      { id: 'markets', label: 'Markets', type: 'list', brandAttribute: 'markets' },
      { id: 'liveStreaming', label: 'Live Streaming', type: 'badge', brandAttribute: 'liveStreaming' },
      { id: 'cashOut', label: 'Cash Out', type: 'badge', brandAttribute: 'cashOut' },
      { id: 'bestFor', label: 'Best For', type: 'text', brandAttribute: 'bestFor' },
      { id: 'score', label: 'Score', type: 'rating', brandAttribute: 'overallScore' },
    ]),
  },
  {
    template_id: 'quick-comparison',
    name: 'Quick Comparison',
    description: 'Minimal comparison table with key highlights',
    columns: JSON.stringify([
      { id: 'rank', label: '#', type: 'number', brandAttribute: '_rank' },
      { id: 'name', label: 'Name', type: 'text', brandAttribute: 'name' },
      { id: 'highlight', label: 'Why We Like It', type: 'text', brandAttribute: 'highlights' },
      { id: 'score', label: 'Score', type: 'rating', brandAttribute: 'overallScore' },
    ]),
  },
];

// Default translations for column labels
const DEFAULT_TRANSLATIONS: Record<string, Record<string, string>> = {
  // Column labels
  '#': {
    'de-DE': '#', 'de-AT': '#', 'es-ES': '#', 'es-MX': '#', 'fr-FR': '#', 'fr-CA': '#',
    'it-IT': '#', 'pt-BR': '#', 'pt-PT': '#', 'nl-NL': '#', 'sv-SE': '#', 'no-NO': '#',
    'da-DK': '#', 'fi-FI': '#', 'pl-PL': '#', 'ru-RU': '#', 'ja-JP': '#', 'zh-CN': '#',
    'zh-TW': '#', 'ko-KR': '#', 'ar-SA': '#', 'hi-IN': '#', 'tr-TR': '#',
  },
  'Casino': {
    'de-DE': 'Casino', 'de-AT': 'Casino', 'es-ES': 'Casino', 'es-MX': 'Casino',
    'fr-FR': 'Casino', 'fr-CA': 'Casino', 'it-IT': 'Casinò', 'pt-BR': 'Cassino',
    'pt-PT': 'Casino', 'nl-NL': 'Casino', 'sv-SE': 'Casino', 'no-NO': 'Casino',
    'da-DK': 'Casino', 'fi-FI': 'Kasino', 'pl-PL': 'Kasyno', 'ru-RU': 'Казино',
    'ja-JP': 'カジノ', 'zh-CN': '赌场', 'zh-TW': '賭場', 'ko-KR': '카지노',
    'ar-SA': 'كازينو', 'hi-IN': 'कैसीनो', 'tr-TR': 'Casino',
  },
  'License': {
    'de-DE': 'Lizenz', 'de-AT': 'Lizenz', 'es-ES': 'Licencia', 'es-MX': 'Licencia',
    'fr-FR': 'Licence', 'fr-CA': 'Licence', 'it-IT': 'Licenza', 'pt-BR': 'Licença',
    'pt-PT': 'Licença', 'nl-NL': 'Licentie', 'sv-SE': 'Licens', 'no-NO': 'Lisens',
    'da-DK': 'Licens', 'fi-FI': 'Lisenssi', 'pl-PL': 'Licencja', 'ru-RU': 'Лицензия',
    'ja-JP': 'ライセンス', 'zh-CN': '许可证', 'zh-TW': '許可證', 'ko-KR': '라이선스',
    'ar-SA': 'الترخيص', 'hi-IN': 'लाइसेंस', 'tr-TR': 'Lisans',
  },
  'Welcome Offer': {
    'de-DE': 'Willkommensbonus', 'de-AT': 'Willkommensbonus', 'es-ES': 'Bono de Bienvenida',
    'es-MX': 'Bono de Bienvenida', 'fr-FR': 'Bonus de Bienvenue', 'fr-CA': 'Bonus de Bienvenue',
    'it-IT': 'Bonus di Benvenuto', 'pt-BR': 'Bônus de Boas-vindas', 'pt-PT': 'Bónus de Boas-vindas',
    'nl-NL': 'Welkomstbonus', 'sv-SE': 'Välkomstbonus', 'no-NO': 'Velkomstbonus',
    'da-DK': 'Velkomstbonus', 'fi-FI': 'Tervetuliaisbonus', 'pl-PL': 'Bonus Powitalny',
    'ru-RU': 'Приветственный бонус', 'ja-JP': 'ウェルカムボーナス', 'zh-CN': '欢迎奖金',
    'zh-TW': '歡迎獎金', 'ko-KR': '웰컴 보너스', 'ar-SA': 'مكافأة الترحيب', 'hi-IN': 'स्वागत बोनस',
    'tr-TR': 'Hoş Geldin Bonusu',
  },
  'Wagering': {
    'de-DE': 'Umsatz', 'de-AT': 'Umsatz', 'es-ES': 'Requisitos de Apuesta', 'es-MX': 'Requisitos de Apuesta',
    'fr-FR': 'Conditions de Mise', 'fr-CA': 'Conditions de Mise', 'it-IT': 'Requisiti di Scommessa',
    'pt-BR': 'Requisitos de Apostas', 'pt-PT': 'Requisitos de Apostas', 'nl-NL': 'Inzetvereisten',
    'sv-SE': 'Omsättningskrav', 'no-NO': 'Omsetningskrav', 'da-DK': 'Gennemspilskrav',
    'fi-FI': 'Kierrätysvaatimus', 'pl-PL': 'Wymagania Obrotu', 'ru-RU': 'Вейджер',
    'ja-JP': '賭け条件', 'zh-CN': '投注要求', 'zh-TW': '投注要求', 'ko-KR': '베팅 조건',
    'ar-SA': 'متطلبات الرهان', 'hi-IN': 'दांव की शर्तें', 'tr-TR': 'Çevrim Şartları',
  },
  'Withdrawal': {
    'de-DE': 'Auszahlung', 'de-AT': 'Auszahlung', 'es-ES': 'Retiro', 'es-MX': 'Retiro',
    'fr-FR': 'Retrait', 'fr-CA': 'Retrait', 'it-IT': 'Prelievo', 'pt-BR': 'Saque',
    'pt-PT': 'Levantamento', 'nl-NL': 'Opname', 'sv-SE': 'Uttag', 'no-NO': 'Uttak',
    'da-DK': 'Udbetaling', 'fi-FI': 'Nosto', 'pl-PL': 'Wypłata', 'ru-RU': 'Вывод',
    'ja-JP': '出金', 'zh-CN': '提款', 'zh-TW': '提款', 'ko-KR': '출금',
    'ar-SA': 'السحب', 'hi-IN': 'निकासी', 'tr-TR': 'Çekim',
  },
  'Payments': {
    'de-DE': 'Zahlungen', 'de-AT': 'Zahlungen', 'es-ES': 'Pagos', 'es-MX': 'Pagos',
    'fr-FR': 'Paiements', 'fr-CA': 'Paiements', 'it-IT': 'Pagamenti', 'pt-BR': 'Pagamentos',
    'pt-PT': 'Pagamentos', 'nl-NL': 'Betalingen', 'sv-SE': 'Betalningar', 'no-NO': 'Betalinger',
    'da-DK': 'Betalinger', 'fi-FI': 'Maksut', 'pl-PL': 'Płatności', 'ru-RU': 'Платежи',
    'ja-JP': '支払い方法', 'zh-CN': '支付方式', 'zh-TW': '付款方式', 'ko-KR': '결제 방법',
    'ar-SA': 'المدفوعات', 'hi-IN': 'भुगतान', 'tr-TR': 'Ödemeler',
  },
  'Highlights': {
    'de-DE': 'Highlights', 'de-AT': 'Highlights', 'es-ES': 'Destacados', 'es-MX': 'Destacados',
    'fr-FR': 'Points Forts', 'fr-CA': 'Points Forts', 'it-IT': 'Punti di Forza', 'pt-BR': 'Destaques',
    'pt-PT': 'Destaques', 'nl-NL': 'Hoogtepunten', 'sv-SE': 'Höjdpunkter', 'no-NO': 'Høydepunkter',
    'da-DK': 'Højdepunkter', 'fi-FI': 'Kohokohdat', 'pl-PL': 'Wyróżniki', 'ru-RU': 'Особенности',
    'ja-JP': 'ハイライト', 'zh-CN': '亮点', 'zh-TW': '亮點', 'ko-KR': '하이라이트',
    'ar-SA': 'المميزات', 'hi-IN': 'मुख्य विशेषताएं', 'tr-TR': 'Öne Çıkanlar',
  },
  'Best For': {
    'de-DE': 'Ideal für', 'de-AT': 'Ideal für', 'es-ES': 'Ideal Para', 'es-MX': 'Ideal Para',
    'fr-FR': 'Idéal Pour', 'fr-CA': 'Idéal Pour', 'it-IT': 'Ideale Per', 'pt-BR': 'Ideal Para',
    'pt-PT': 'Ideal Para', 'nl-NL': 'Ideaal Voor', 'sv-SE': 'Bäst För', 'no-NO': 'Best For',
    'da-DK': 'Bedst Til', 'fi-FI': 'Paras', 'pl-PL': 'Najlepsze Dla', 'ru-RU': 'Лучше всего для',
    'ja-JP': 'おすすめ', 'zh-CN': '最适合', 'zh-TW': '最適合', 'ko-KR': '추천 대상',
    'ar-SA': 'الأفضل لـ', 'hi-IN': 'के लिए सर्वश्रेष्ठ', 'tr-TR': 'En İyi',
  },
  'Score': {
    'de-DE': 'Bewertung', 'de-AT': 'Bewertung', 'es-ES': 'Puntuación', 'es-MX': 'Puntuación',
    'fr-FR': 'Note', 'fr-CA': 'Note', 'it-IT': 'Punteggio', 'pt-BR': 'Nota',
    'pt-PT': 'Pontuação', 'nl-NL': 'Score', 'sv-SE': 'Betyg', 'no-NO': 'Poengsum',
    'da-DK': 'Score', 'fi-FI': 'Pisteet', 'pl-PL': 'Ocena', 'ru-RU': 'Оценка',
    'ja-JP': 'スコア', 'zh-CN': '评分', 'zh-TW': '評分', 'ko-KR': '점수',
    'ar-SA': 'التقييم', 'hi-IN': 'स्कोर', 'tr-TR': 'Puan',
  },
  'Name': {
    'de-DE': 'Name', 'de-AT': 'Name', 'es-ES': 'Nombre', 'es-MX': 'Nombre',
    'fr-FR': 'Nom', 'fr-CA': 'Nom', 'it-IT': 'Nome', 'pt-BR': 'Nome',
    'pt-PT': 'Nome', 'nl-NL': 'Naam', 'sv-SE': 'Namn', 'no-NO': 'Navn',
    'da-DK': 'Navn', 'fi-FI': 'Nimi', 'pl-PL': 'Nazwa', 'ru-RU': 'Название',
    'ja-JP': '名前', 'zh-CN': '名称', 'zh-TW': '名稱', 'ko-KR': '이름',
    'ar-SA': 'الاسم', 'hi-IN': 'नाम', 'tr-TR': 'İsim',
  },
  'Sportsbook': {
    'de-DE': 'Sportwetten', 'de-AT': 'Sportwetten', 'es-ES': 'Casa de Apuestas', 'es-MX': 'Casa de Apuestas',
    'fr-FR': 'Paris Sportifs', 'fr-CA': 'Paris Sportifs', 'it-IT': 'Scommesse Sportive',
    'pt-BR': 'Casa de Apostas', 'pt-PT': 'Casa de Apostas', 'nl-NL': 'Bookmaker',
    'sv-SE': 'Sportbok', 'no-NO': 'Spillselskap', 'da-DK': 'Bookmaker', 'fi-FI': 'Vedonlyöntisivusto',
    'pl-PL': 'Bukmacher', 'ru-RU': 'Букмекер', 'ja-JP': 'スポーツブック', 'zh-CN': '体育博彩',
    'zh-TW': '體育博彩', 'ko-KR': '스포츠북', 'ar-SA': 'المراهنات الرياضية', 'hi-IN': 'स्पोर्ट्सबुक',
    'tr-TR': 'Bahis Sitesi',
  },
  'Odds Quality': {
    'de-DE': 'Quotenqualität', 'de-AT': 'Quotenqualität', 'es-ES': 'Calidad de Cuotas',
    'es-MX': 'Calidad de Cuotas', 'fr-FR': 'Qualité des Cotes', 'fr-CA': 'Qualité des Cotes',
    'it-IT': 'Qualità Quote', 'pt-BR': 'Qualidade das Odds', 'pt-PT': 'Qualidade das Odds',
    'nl-NL': 'Quotakwaliteit', 'sv-SE': 'Oddskvalitet', 'no-NO': 'Oddskvalitet',
    'da-DK': 'Odds Kvalitet', 'fi-FI': 'Kertoimien laatu', 'pl-PL': 'Jakość Kursów',
    'ru-RU': 'Качество коэффициентов', 'ja-JP': 'オッズの質', 'zh-CN': '赔率质量',
    'zh-TW': '賠率質量', 'ko-KR': '배당률 품질', 'ar-SA': 'جودة الأرجحية', 'hi-IN': 'ऑड्स गुणवत्ता',
    'tr-TR': 'Oran Kalitesi',
  },
  'Markets': {
    'de-DE': 'Märkte', 'de-AT': 'Märkte', 'es-ES': 'Mercados', 'es-MX': 'Mercados',
    'fr-FR': 'Marchés', 'fr-CA': 'Marchés', 'it-IT': 'Mercati', 'pt-BR': 'Mercados',
    'pt-PT': 'Mercados', 'nl-NL': 'Markten', 'sv-SE': 'Marknader', 'no-NO': 'Markeder',
    'da-DK': 'Markeder', 'fi-FI': 'Markkinat', 'pl-PL': 'Rynki', 'ru-RU': 'Рынки',
    'ja-JP': '市場', 'zh-CN': '市场', 'zh-TW': '市場', 'ko-KR': '시장',
    'ar-SA': 'الأسواق', 'hi-IN': 'बाजार', 'tr-TR': 'Pazarlar',
  },
  'Live Streaming': {
    'de-DE': 'Live-Streaming', 'de-AT': 'Live-Streaming', 'es-ES': 'Streaming en Vivo',
    'es-MX': 'Streaming en Vivo', 'fr-FR': 'Streaming en Direct', 'fr-CA': 'Streaming en Direct',
    'it-IT': 'Streaming Live', 'pt-BR': 'Streaming ao Vivo', 'pt-PT': 'Streaming ao Vivo',
    'nl-NL': 'Live Streaming', 'sv-SE': 'Livestreaming', 'no-NO': 'Direktestrømming',
    'da-DK': 'Live Streaming', 'fi-FI': 'Suoratoisto', 'pl-PL': 'Transmisje na Żywo',
    'ru-RU': 'Прямые трансляции', 'ja-JP': 'ライブストリーミング', 'zh-CN': '直播',
    'zh-TW': '直播', 'ko-KR': '라이브 스트리밍', 'ar-SA': 'البث المباشر', 'hi-IN': 'लाइव स्ट्रीमिंग',
    'tr-TR': 'Canlı Yayın',
  },
  'Cash Out': {
    'de-DE': 'Cash Out', 'de-AT': 'Cash Out', 'es-ES': 'Cobrar', 'es-MX': 'Cobrar',
    'fr-FR': 'Cash Out', 'fr-CA': 'Cash Out', 'it-IT': 'Cash Out', 'pt-BR': 'Cash Out',
    'pt-PT': 'Cash Out', 'nl-NL': 'Cash Out', 'sv-SE': 'Cash Out', 'no-NO': 'Cash Out',
    'da-DK': 'Cash Out', 'fi-FI': 'Cash Out', 'pl-PL': 'Cash Out', 'ru-RU': 'Кэшаут',
    'ja-JP': 'キャッシュアウト', 'zh-CN': '提前结算', 'zh-TW': '提前結算', 'ko-KR': '캐시아웃',
    'ar-SA': 'سحب الرهان', 'hi-IN': 'कैश आउट', 'tr-TR': 'Nakit Çıkış',
  },
  'Why We Like It': {
    'de-DE': 'Warum wir es mögen', 'de-AT': 'Warum wir es mögen', 'es-ES': 'Por qué nos gusta',
    'es-MX': 'Por qué nos gusta', 'fr-FR': 'Pourquoi nous l\'aimons', 'fr-CA': 'Pourquoi nous l\'aimons',
    'it-IT': 'Perché ci piace', 'pt-BR': 'Por que gostamos', 'pt-PT': 'Porque gostamos',
    'nl-NL': 'Waarom we het leuk vinden', 'sv-SE': 'Varför vi gillar det', 'no-NO': 'Hvorfor vi liker det',
    'da-DK': 'Hvorfor vi kan lide det', 'fi-FI': 'Miksi pidämme siitä', 'pl-PL': 'Dlaczego lubimy',
    'ru-RU': 'Почему нам нравится', 'ja-JP': 'おすすめの理由', 'zh-CN': '我们喜欢的原因',
    'zh-TW': '我們喜歡的原因', 'ko-KR': '추천 이유', 'ar-SA': 'لماذا نحبه', 'hi-IN': 'हमें क्यों पसंद है',
    'tr-TR': 'Neden Beğendik',
  },
  'Bonus': {
    'de-DE': 'Bonus', 'de-AT': 'Bonus', 'es-ES': 'Bono', 'es-MX': 'Bono',
    'fr-FR': 'Bonus', 'fr-CA': 'Bonus', 'it-IT': 'Bonus', 'pt-BR': 'Bônus',
    'pt-PT': 'Bónus', 'nl-NL': 'Bonus', 'sv-SE': 'Bonus', 'no-NO': 'Bonus',
    'da-DK': 'Bonus', 'fi-FI': 'Bonus', 'pl-PL': 'Bonus', 'ru-RU': 'Бонус',
    'ja-JP': 'ボーナス', 'zh-CN': '奖金', 'zh-TW': '獎金', 'ko-KR': '보너스',
    'ar-SA': 'مكافأة', 'hi-IN': 'बोनस', 'tr-TR': 'Bonus',
  },
  'Terms': {
    'de-DE': 'Bedingungen', 'de-AT': 'Bedingungen', 'es-ES': 'Términos', 'es-MX': 'Términos',
    'fr-FR': 'Conditions', 'fr-CA': 'Conditions', 'it-IT': 'Termini', 'pt-BR': 'Termos',
    'pt-PT': 'Termos', 'nl-NL': 'Voorwaarden', 'sv-SE': 'Villkor', 'no-NO': 'Vilkår',
    'da-DK': 'Vilkår', 'fi-FI': 'Ehdot', 'pl-PL': 'Warunki', 'ru-RU': 'Условия',
    'ja-JP': '利用規約', 'zh-CN': '条款', 'zh-TW': '條款', 'ko-KR': '약관',
    'ar-SA': 'الشروط', 'hi-IN': 'शर्तें', 'tr-TR': 'Şartlar',
  },
  'Rating': {
    'de-DE': 'Bewertung', 'de-AT': 'Bewertung', 'es-ES': 'Calificación', 'es-MX': 'Calificación',
    'fr-FR': 'Note', 'fr-CA': 'Note', 'it-IT': 'Valutazione', 'pt-BR': 'Avaliação',
    'pt-PT': 'Avaliação', 'nl-NL': 'Beoordeling', 'sv-SE': 'Betyg', 'no-NO': 'Vurdering',
    'da-DK': 'Bedømmelse', 'fi-FI': 'Arvosana', 'pl-PL': 'Ocena', 'ru-RU': 'Рейтинг',
    'ja-JP': '評価', 'zh-CN': '评分', 'zh-TW': '評分', 'ko-KR': '평점',
    'ar-SA': 'التقييم', 'hi-IN': 'रेटिंग', 'tr-TR': 'Puan',
  },
  'CTA': {
    'de-DE': 'Aktion', 'de-AT': 'Aktion', 'es-ES': 'Acción', 'es-MX': 'Acción',
    'fr-FR': 'Action', 'fr-CA': 'Action', 'it-IT': 'Azione', 'pt-BR': 'Ação',
    'pt-PT': 'Ação', 'nl-NL': 'Actie', 'sv-SE': 'Åtgärd', 'no-NO': 'Handling',
    'da-DK': 'Handling', 'fi-FI': 'Toiminto', 'pl-PL': 'Akcja', 'ru-RU': 'Действие',
    'ja-JP': 'アクション', 'zh-CN': '操作', 'zh-TW': '操作', 'ko-KR': '액션',
    'ar-SA': 'إجراء', 'hi-IN': 'कार्रवाई', 'tr-TR': 'İşlem',
  },
  'Description': {
    'de-DE': 'Beschreibung', 'de-AT': 'Beschreibung', 'es-ES': 'Descripción', 'es-MX': 'Descripción',
    'fr-FR': 'Description', 'fr-CA': 'Description', 'it-IT': 'Descrizione', 'pt-BR': 'Descrição',
    'pt-PT': 'Descrição', 'nl-NL': 'Beschrijving', 'sv-SE': 'Beskrivning', 'no-NO': 'Beskrivelse',
    'da-DK': 'Beskrivelse', 'fi-FI': 'Kuvaus', 'pl-PL': 'Opis', 'ru-RU': 'Описание',
    'ja-JP': '説明', 'zh-CN': '描述', 'zh-TW': '描述', 'ko-KR': '설명',
    'ar-SA': 'الوصف', 'hi-IN': 'विवरण', 'tr-TR': 'Açıklama',
  },
  'Pros': {
    'de-DE': 'Vorteile', 'de-AT': 'Vorteile', 'es-ES': 'Ventajas', 'es-MX': 'Ventajas',
    'fr-FR': 'Avantages', 'fr-CA': 'Avantages', 'it-IT': 'Vantaggi', 'pt-BR': 'Vantagens',
    'pt-PT': 'Vantagens', 'nl-NL': 'Voordelen', 'sv-SE': 'Fördelar', 'no-NO': 'Fordeler',
    'da-DK': 'Fordele', 'fi-FI': 'Edut', 'pl-PL': 'Zalety', 'ru-RU': 'Плюсы',
    'ja-JP': 'メリット', 'zh-CN': '优点', 'zh-TW': '優點', 'ko-KR': '장점',
    'ar-SA': 'المميزات', 'hi-IN': 'फायदे', 'tr-TR': 'Artılar',
  },
  'Cons': {
    'de-DE': 'Nachteile', 'de-AT': 'Nachteile', 'es-ES': 'Desventajas', 'es-MX': 'Desventajas',
    'fr-FR': 'Inconvénients', 'fr-CA': 'Inconvénients', 'it-IT': 'Svantaggi', 'pt-BR': 'Desvantagens',
    'pt-PT': 'Desvantagens', 'nl-NL': 'Nadelen', 'sv-SE': 'Nackdelar', 'no-NO': 'Ulemper',
    'da-DK': 'Ulemper', 'fi-FI': 'Haitat', 'pl-PL': 'Wady', 'ru-RU': 'Минусы',
    'ja-JP': 'デメリット', 'zh-CN': '缺点', 'zh-TW': '缺點', 'ko-KR': '단점',
    'ar-SA': 'العيوب', 'hi-IN': 'नुकसान', 'tr-TR': 'Eksiler',
  },
};

function seedDefaultTranslations(database: Database.Database): void {
  const now = new Date().toISOString();
  // Use INSERT OR REPLACE to upsert translations (allows adding new ones to existing DB)
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO translations (key, language, translation, created_at)
    VALUES (?, ?, ?, ?)
  `);

  let count = 0;
  database.transaction(() => {
    for (const [key, translations] of Object.entries(DEFAULT_TRANSLATIONS)) {
      for (const [language, translation] of Object.entries(translations)) {
        stmt.run(key, language, translation, now);
        count++;
      }
    }
  })();

  logger.info({ count }, 'Seeded default translations');
}

function seedDefaultTemplates(database: Database.Database): void {
  const existingCount = database.prepare('SELECT COUNT(*) as count FROM toplist_templates').get() as { count: number };

  if (existingCount.count > 0) {
    logger.debug('Toplist templates already seeded, skipping');
    return;
  }

  const now = new Date().toISOString();
  const stmt = database.prepare(`
    INSERT INTO toplist_templates (template_id, name, description, columns, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  database.transaction(() => {
    for (const template of DEFAULT_TOPLIST_TEMPLATES) {
      stmt.run(template.template_id, template.name, template.description, template.columns, now);
    }
  })();

  logger.info({ count: DEFAULT_TOPLIST_TEMPLATES.length }, 'Seeded default toplist templates');
}

function runMigrations(database: Database.Database): void {
  const currentVersion = getCurrentVersion(database);

  if (currentVersion >= SCHEMA_VERSION) {
    logger.debug({ currentVersion, targetVersion: SCHEMA_VERSION }, 'Database schema is up to date');
    return;
  }

  logger.info({ currentVersion, targetVersion: SCHEMA_VERSION }, 'Running database migrations');

  for (let version = currentVersion + 1; version <= SCHEMA_VERSION; version++) {
    const statements = MIGRATIONS[version];
    if (!statements) continue;

    database.transaction(() => {
      for (const sql of statements) {
        database.exec(sql);
      }
      database.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(version);
    })();

    logger.info({ version }, 'Applied migration');

    // Seed templates after migration 5
    if (version === 5) {
      seedDefaultTemplates(database);
    }

    // Seed translations after migration 7
    if (version === 7) {
      seedDefaultTranslations(database);
    }
  }
}

export function getDatabase(dbPath: string): Database.Database {
  if (db) {
    return db;
  }

  ensureDataDirectory(dbPath);

  logger.info({ dbPath }, 'Initializing SQLite database');

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');

  // Run migrations
  runMigrations(db);

  // Always seed/update translations (uses upsert so safe to run multiple times)
  seedDefaultTranslations(db);

  logger.info('SQLite database initialized successfully');

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('SQLite database closed');
  }
}

export function getDatabaseStats(database: Database.Database): { serpEntries: number; pageEntries: number; dbSizeBytes: number } {
  const serpCount = database.prepare('SELECT COUNT(*) as count FROM serp_cache').get() as { count: number };
  const pageCount = database.prepare('SELECT COUNT(*) as count FROM page_cache').get() as { count: number };
  const pageSize = database.pragma('page_size', { simple: true }) as number;
  const pageCount2 = database.pragma('page_count', { simple: true }) as number;

  return {
    serpEntries: serpCount.count,
    pageEntries: pageCount.count,
    dbSizeBytes: pageSize * pageCount2,
  };
}
