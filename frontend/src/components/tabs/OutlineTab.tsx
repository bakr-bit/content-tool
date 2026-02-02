import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  Pencil,
  List,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
  Table2,
} from 'lucide-react';
import { researchAndGenerateOutline, getComponents } from '@/services/api';
import type { UseArticleFormReturn } from '@/hooks/useArticleForm';
import {
  LANGUAGE_NAMES,
  COMPONENT_TYPE_NAMES,
  type Outline,
  type OutlineSection,
  type Language,
  type ComponentType,
  type ComponentInfo,
} from '@/types/article';

// Translations for structure section titles
const SECTION_TRANSLATIONS: Record<string, Record<string, string>> = {
  'en-US': { keyTakeaways: 'Key Takeaways', toc: 'Table of Contents', faqs: 'Frequently Asked Questions', conclusion: 'Conclusion' },
  'en-GB': { keyTakeaways: 'Key Takeaways', toc: 'Table of Contents', faqs: 'Frequently Asked Questions', conclusion: 'Conclusion' },
  'en-AU': { keyTakeaways: 'Key Takeaways', toc: 'Table of Contents', faqs: 'Frequently Asked Questions', conclusion: 'Conclusion' },
  'es-ES': { keyTakeaways: 'Puntos Clave', toc: 'Tabla de Contenidos', faqs: 'Preguntas Frecuentes', conclusion: 'Conclusión' },
  'es-MX': { keyTakeaways: 'Puntos Clave', toc: 'Tabla de Contenidos', faqs: 'Preguntas Frecuentes', conclusion: 'Conclusión' },
  'fr-FR': { keyTakeaways: 'Points Clés', toc: 'Table des Matières', faqs: 'Questions Fréquentes', conclusion: 'Conclusion' },
  'fr-CA': { keyTakeaways: 'Points Clés', toc: 'Table des Matières', faqs: 'Questions Fréquentes', conclusion: 'Conclusion' },
  'de-DE': { keyTakeaways: 'Wichtigste Erkenntnisse', toc: 'Inhaltsverzeichnis', faqs: 'Häufig Gestellte Fragen', conclusion: 'Fazit' },
  'de-AT': { keyTakeaways: 'Wichtigste Erkenntnisse', toc: 'Inhaltsverzeichnis', faqs: 'Häufig Gestellte Fragen', conclusion: 'Fazit' },
  'it-IT': { keyTakeaways: 'Punti Chiave', toc: 'Indice', faqs: 'Domande Frequenti', conclusion: 'Conclusione' },
  'pt-BR': { keyTakeaways: 'Principais Conclusões', toc: 'Índice', faqs: 'Perguntas Frequentes', conclusion: 'Conclusão' },
  'pt-PT': { keyTakeaways: 'Principais Conclusões', toc: 'Índice', faqs: 'Perguntas Frequentes', conclusion: 'Conclusão' },
  'nl-NL': { keyTakeaways: 'Belangrijkste Punten', toc: 'Inhoudsopgave', faqs: 'Veelgestelde Vragen', conclusion: 'Conclusie' },
  'sv-SE': { keyTakeaways: 'Viktiga Punkter', toc: 'Innehållsförteckning', faqs: 'Vanliga Frågor', conclusion: 'Slutsats' },
  'no-NO': { keyTakeaways: 'Viktige Punkter', toc: 'Innholdsfortegnelse', faqs: 'Ofte Stilte Spørsmål', conclusion: 'Konklusjon' },
  'da-DK': { keyTakeaways: 'Vigtigste Punkter', toc: 'Indholdsfortegnelse', faqs: 'Ofte Stillede Spørgsmål', conclusion: 'Konklusion' },
  'fi-FI': { keyTakeaways: 'Tärkeimmät Havainnot', toc: 'Sisällysluettelo', faqs: 'Usein Kysytyt Kysymykset', conclusion: 'Johtopäätös' },
  'pl-PL': { keyTakeaways: 'Kluczowe Wnioski', toc: 'Spis Treści', faqs: 'Często Zadawane Pytania', conclusion: 'Podsumowanie' },
  'ru-RU': { keyTakeaways: 'Ключевые Выводы', toc: 'Содержание', faqs: 'Часто Задаваемые Вопросы', conclusion: 'Заключение' },
  'ja-JP': { keyTakeaways: '重要ポイント', toc: '目次', faqs: 'よくある質問', conclusion: 'まとめ' },
  'zh-CN': { keyTakeaways: '要点总结', toc: '目录', faqs: '常见问题', conclusion: '结论' },
  'zh-TW': { keyTakeaways: '重點摘要', toc: '目錄', faqs: '常見問題', conclusion: '結論' },
  'ko-KR': { keyTakeaways: '핵심 요약', toc: '목차', faqs: '자주 묻는 질문', conclusion: '결론' },
  'ar-SA': { keyTakeaways: 'النقاط الرئيسية', toc: 'جدول المحتويات', faqs: 'الأسئلة الشائعة', conclusion: 'الخلاصة' },
  'hi-IN': { keyTakeaways: 'मुख्य बिंदु', toc: 'विषय सूची', faqs: 'अक्सर पूछे जाने वाले प्रश्न', conclusion: 'निष्कर्ष' },
  'tr-TR': { keyTakeaways: 'Önemli Noktalar', toc: 'İçindekiler', faqs: 'Sıkça Sorulan Sorular', conclusion: 'Sonuç' },
};

function getSectionTitle(language: Language, section: 'keyTakeaways' | 'toc' | 'faqs' | 'conclusion'): string {
  return SECTION_TRANSLATIONS[language]?.[section] || SECTION_TRANSLATIONS['en-US'][section];
}

interface OutlineTabProps {
  form: UseArticleFormReturn;
}

type GenerationStatus = 'idle' | 'researching' | 'generating' | 'complete' | 'error';
type ViewMode = 'preview' | 'edit' | 'structured';

// Toplist insertion indicator component
interface ToplistIndicatorProps {
  toplists: { name: string; heading?: string; headingLevel?: string; entries?: unknown[] }[];
}

function ToplistIndicator({ toplists }: ToplistIndicatorProps) {
  if (toplists.length === 0) return null;

  return (
    <div className="border-2 border-dashed border-primary/40 rounded-lg p-3 bg-primary/5 my-2">
      <div className="flex items-center gap-2 text-sm text-primary">
        <Table2 className="h-4 w-4" />
        <span className="font-medium">Toplist{toplists.length > 1 ? 's' : ''} will be inserted here</span>
      </div>
      <div className="mt-2 space-y-1">
        {toplists.map((toplist, idx) => (
          <div key={idx} className="text-xs text-muted-foreground pl-6">
            • {toplist.headingLevel === 'h3' ? '###' : '##'} {toplist.heading || toplist.name}
            {toplist.entries && <span className="text-muted-foreground/70"> ({toplist.entries.length} items)</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Default descriptions for each component type (used when adding or changing components)
const COMPONENT_DEFAULT_DESCRIPTIONS: Record<string, string> = {
  prose: 'Write engaging paragraph content that covers this topic thoroughly. Use short paragraphs, include relevant examples, and maintain natural flow.',

  toplist: `Create a comparison table ranking the top options with uniform columns for each entry.

EXAMPLE TABLE FORMAT:
| # | Name | License | Welcome Offer | Wagering | Withdrawal Time | Payment Methods | Highlights | Best For | Score |
|---|------|---------|---------------|----------|-----------------|-----------------|------------|----------|-------|
| 1 | Instant Casino | Curaçao (CGA/LOK) | 200% up to €7,500 | x30 | 10–60 min (crypto) | USDT, BTC, SEPA | Fast withdrawals | Speed-first players | 9.8 |
| 2 | Lizaro | MGA | 350% up to €1,000 + 200 FS | x20 | 0–2h | Visa, SEPA, USDT | Best overall balance | Most players | 9.6 |
| 3 | BetNinja | Curaçao (CGA/LOK) | €1,000 + 100 FS | x25 | 0–3h | Crypto, Apple Pay | Missions + promos | Promo hunters | 9.4 |

KEY REQUIREMENTS:
- Same columns in same order for every entry (consistency signals quality)
- Include "Best For" to segment user intent
- Score should reflect actual evaluation, not just rankings
- Include practical details (actual withdrawal times, specific methods)`,

  mini_review: `Write a detailed mini-review card with consistent structured fields for each entry.

EXAMPLE FORMAT:
**License:** Malta Gaming Authority (MGA)
**Welcome offer:** 350% up to €1,000 + 200 FS; Wagering: x20
**Payments:** Visa/Mastercard, SEPA/Instant, USDT; typical withdrawals 0–2h
**Games:** ~6,500 slots; ~55 live tables; providers include Evolution, Pragmatic Play, Play'n GO
**Best for:** Most users who want a balanced option with reputable licensing

**Why [Name] ranks [#X]:** Explain the specific reasons this option earns its position. Focus on operational details like withdrawal reliability, bonus fairness, and UX quality - not just marketing claims.

**Bonus reality check:** Don't just repeat the headline offer. Explain wagering scope (bonus only vs deposit+bonus), game contributions, max bet limits, and time restrictions.`,

  category_ranking: `Create a focused mini-ranking (3-5 items) for this specific category with columns relevant to that category.

EXAMPLE - Fastest Withdrawals:
| Name | Fastest Method | Typical Time | Why It Wins |
|------|----------------|--------------|-------------|
| Instant Casino | USDT | 10–60 min | Consistently fast crypto processing |
| Lizaro | SEPA/Instant | 0–2h | Strong EU payments + automation |
| HolyLuck | BTC | 0–3h | Fast crypto payouts for mid-sized withdrawals |

EXAMPLE - Best Live Casino:
| Name | Live Tables | Top Providers | Best For |
|------|-------------|---------------|----------|
| Instant Casino | ~70 | Evolution, Pragmatic Live | Game shows + roulette |
| Uspin | ~50 | Evolution, Ezugi | Table variety |
| Lizaro | ~55 | Evolution | Balanced live offering |

Each mini-ranking should match a specific user intent (speed, game type, bonus style, etc.)`,

  payment_table: `Create a payment methods comparison table with practical operational details.

EXAMPLE FORMAT:
| Method | Deposit min/max | Withdrawal min/max | Typical payout time | Fees | KYC timing | Notes |
|--------|-----------------|-------------------|---------------------|------|------------|-------|
| SEPA / Instant | €10–€10,000 | €20–€50,000 | 0–24h | Usually none | At first withdrawal | Best fiat option for EU users |
| Visa / Mastercard | €10–€5,000 | €20–€10,000 | 1–3 business days | 0–2% possible | At first withdrawal | Some banks block offshore payments |
| Apple Pay / Google Pay | €10–€2,000 | — | N/A | None | At first withdrawal | Fast deposits; withdrawals often via bank/crypto |
| Skrill / Neteller | €10–€5,000 | €20–€10,000 | 0–24h | ~1% possible | At first withdrawal | Useful for fintech-style flows |
| Crypto (BTC/ETH/USDT) | €20–no cap | €20–no cap | 5–60 min | Network fee | Optional / larger withdrawals | Speed and control; stablecoins avoid volatility |

KEY DETAILS TO INCLUDE:
- Separate deposit vs withdrawal info (they often differ)
- Actual processing times (casino approval vs payment rail time)
- Fees and restrictions
- When KYC is triggered`,

  comparison: `Create a side-by-side comparison table showing key differences between options.

EXAMPLE FORMAT (Regulated vs Offshore):
| Factor | Option A (Offshore) | Option B (Regulated) |
|--------|---------------------|----------------------|
| Self-exclusion check | No | Yes (mandatory) |
| Signup process | Email/phone, sometimes wallet | DigiD/iDIN + verification |
| KYC timing | Often at withdrawal | At signup |
| Mandatory limits | Usually optional | Mandatory |
| Bonus restrictions | Typically fewer restrictions | Stricter (advertising/bonus rules) |
| Features | Bonus buy/autoplay often available | Often restricted |

KEY REQUIREMENTS:
- 6-10 comparison aspects covering safety, bonuses, selection, payments, support
- Be factual and neutral - explain trade-offs, not just advantages
- Help reader understand what they gain AND what they lose with each option`,

  faq: `Write 5-7 FAQs that address real user objections and concerns. Focus on questions from "People Also Ask" and common support queries.

EXAMPLE FORMAT:
**Will I need KYC?**
Usually yes, at first withdrawal or larger withdrawals. Most sites let you deposit and play with minimal friction, but verification appears when you request payouts or cross internal thresholds.

**Are withdrawals instant?**
Crypto can be minutes; SEPA/e-wallets can be hours; cards are often days. Withdrawal time has two parts: casino processing (approval) and payment rail time (bank/card/chain).

**Can I use a VPN?**
Risky; it may violate terms and lead to account closure or withheld funds. If detected, you may lose access to your balance.

**Do I pay taxes on winnings?**
Tax rules depend on jurisdiction. EU/EEA-licensed operators may be treated differently than non-EU operators. Consult official sources for your specific situation.

KEY REQUIREMENTS:
- Answer the actual question directly in 2-3 sentences
- Include practical details (timeframes, conditions, risks)
- Address objections honestly - don't oversell`,

  how_to: `Write step-by-step instructions that are practical and actionable.

EXAMPLE FORMAT:
**Step 1: Pick your priority**
Decide what matters most: fastest withdrawals (crypto/stablecoins) vs safest license (MGA) vs best game selection. This determines which options to consider.

**Step 2: Create an account**
Register with email/phone or wallet login where supported. Use strong passwords and avoid duplicate accounts across sites.

**Step 3: Deposit smart**
Start with a small deposit to test the flow. If using crypto, double-check addresses and networks (TRC-20 vs ERC-20 matters for speed and fees).

**Step 4: Withdraw early**
Make a small withdrawal to trigger KYC and validate processing before you scale up. This reveals any friction before you have a large balance at stake.

KEY REQUIREMENTS:
- Number each step clearly
- Explain what to do AND why
- Mention common pitfalls to avoid
- Include practical tips (test with small amounts first)`,

  pros_cons: `Create a balanced analysis with specific, verifiable advantages and disadvantages.

EXAMPLE FORMAT - Green Flags vs Red Flags:
| Green Flags | Red Flags |
|-------------|-----------|
| Clear license + operator entity | No license details or vague claims |
| Transparent bonus terms (wagering, max bet, exclusions) | Terms hidden or contradictory |
| Multiple withdrawal methods + realistic processing times | "Instant withdrawals" with no policy detail |
| Responsive support with a real escalation path | Support that only answers with templates |
| RG tools visible (limits, cool-off, self-exclusion) | No RG section or hard-to-find controls |

KEY REQUIREMENTS:
- Be specific - cite actual features, numbers, or policies
- Include 4-6 genuine advantages and 3-5 honest disadvantages
- Avoid generic phrases ("great service") - explain what makes it great
- Include both operational details and user experience factors`,

  methodology: `Explain the evaluation criteria and scoring methodology transparently.

EXAMPLE FORMAT:
**How We Evaluate:**
- **Licensing & reputation (30%):** License issuer, operator transparency, enforcement history
- **Payments & withdrawals (25%):** Methods supported, typical times, fees, KYC triggers
- **Games & providers (20%):** Slots volume, live casino depth, top providers (Evolution, Pragmatic, etc.)
- **Bonus value (15%):** Headline offer, wagering requirements, restrictions, time limits, fairness
- **UX, support & RG tools (10%):** Mobile experience, navigation, support quality, responsible gambling controls

**What We Test:**
- Withdrawal process with small amounts
- Support response time and quality
- Bonus terms clarity and fairness
- Mobile/app usability

**Disclosure:** Rankings may be supported by commercial partnerships, but we only recommend operators that meet our minimum safety and transparency standards.

KEY REQUIREMENTS:
- Show explicit weights for each factor
- Explain what you actually test (not just claim to evaluate)
- Include disclosure about commercial relationships
- Make the evaluation "auditable" - readers should understand how you reached conclusions`,

  decision_flow: `Create a decision guide that helps readers choose based on their specific needs and priorities.

EXAMPLE FORMAT:
**Decision Flow:**
1. **Start with protection level:** If you want regulated protections, choose licensed options. If you accept trade-offs for other benefits, continue.

2. **Pick payment style:**
   - Fiat (SEPA/cards) → prioritize established payment rails
   - Crypto (stablecoins recommended) → prioritize speed and control

3. **Pick game style:**
   - Slots → look for library size and provider variety
   - Live tables → prioritize Evolution/Pragmatic Live coverage
   - Crash/instant → check limits and RTP transparency

4. **Pick bonus tolerance:**
   - Low wagering (x20-x30) → more realistic to clear
   - High cap offers → only if you're a high-volume player

5. **Validate with a test:** Small deposit + small withdrawal to verify the pipeline before scaling up.

KEY REQUIREMENTS:
- Use conditional logic (if X, then Y)
- Segment by user type/priority
- Include actionable next steps for each path
- End with a validation step`,
};

// Section Card Component for structured view
interface SectionCardProps {
  section: OutlineSection;
  index: number;
  components: ComponentInfo[];
  onUpdate: (updates: Partial<OutlineSection>) => void;
  onDelete: () => void;
  onAddSubsection: () => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  depth?: number;
}

function SectionCard({
  section,
  index,
  components,
  onUpdate,
  onDelete,
  onAddSubsection,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  depth = 0
}: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasSubsections = section.subsections && section.subsections.length > 0;

  const handleComponentChange = (componentType: ComponentType) => {
    const updates: Partial<OutlineSection> = { componentType };
    // If description is empty or matches a default, update it with the new component's default
    const currentDesc = section.description || '';
    const isDefaultOrEmpty = !currentDesc || Object.values(COMPONENT_DEFAULT_DESCRIPTIONS).includes(currentDesc);
    if (isDefaultOrEmpty && COMPONENT_DEFAULT_DESCRIPTIONS[componentType]) {
      updates.description = COMPONENT_DEFAULT_DESCRIPTIONS[componentType];
    }
    onUpdate(updates);
  };

  return (
    <div
      draggable={depth === 0}
      onDragStart={() => depth === 0 && onDragStart(index)}
      onDragOver={(e) => depth === 0 && onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={`border rounded-lg bg-card transition-all ${depth > 0 ? 'ml-6 border-muted' : ''} ${isDragging ? 'opacity-50 border-primary border-dashed' : ''}`}
    >
      <div className="p-3 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-2">
          <div className="flex items-center gap-1 pt-1">
            <GripVertical className={`h-4 w-4 text-muted-foreground ${depth === 0 ? 'cursor-grab active:cursor-grabbing' : 'opacity-30'}`} />
            {hasSubsections && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0.5 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>

          <div className="flex-1 space-y-2">
            {/* Heading input */}
            <Input
              value={section.heading}
              onChange={(e) => onUpdate({ heading: e.target.value })}
              className="font-medium"
              placeholder="Section heading"
            />

            {/* Component type and level row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={section.componentType || 'prose'}
                onValueChange={(value) => handleComponentChange(value as ComponentType)}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Component type" />
                </SelectTrigger>
                <SelectContent>
                  {components.map((comp) => (
                    <SelectItem key={comp.id} value={comp.id} className="text-xs">
                      <div className="flex flex-col">
                        <span>{comp.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge variant="outline" className="text-xs">
                H{section.level}
              </Badge>

              {section.suggestedWordCount && (
                <Badge variant="secondary" className="text-xs">
                  ~{section.suggestedWordCount} words
                </Badge>
              )}

              {section.componentType && section.componentType !== 'prose' && (
                <Badge className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/20">
                  {COMPONENT_TYPE_NAMES[section.componentType]}
                </Badge>
              )}
            </div>

            {/* Description */}
            <Textarea
              value={section.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Section description (guides the AI writer)"
              className="text-xs min-h-[60px] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddSubsection}
              className="h-7 w-7 p-0"
              title="Add subsection"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              title="Delete section"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Subsections */}
      {isExpanded && hasSubsections && (
        <div className="border-t px-3 py-2 space-y-2 bg-muted/30">
          {section.subsections!.map((sub, idx) => (
            <SectionCard
              key={sub.id || idx}
              section={sub}
              index={idx}
              components={components}
              depth={depth + 1}
              isDragging={false}
              onDragStart={() => {}}
              onDragOver={() => {}}
              onDragEnd={() => {}}
              onUpdate={(updates) => {
                const newSubsections = [...(section.subsections || [])];
                newSubsections[idx] = { ...newSubsections[idx], ...updates };
                onUpdate({ subsections: newSubsections });
              }}
              onDelete={() => {
                const newSubsections = section.subsections!.filter((_, i) => i !== idx);
                onUpdate({ subsections: newSubsections });
              }}
              onAddSubsection={() => {
                const newSubsections = [...(section.subsections || [])];
                newSubsections.splice(idx + 1, 0, {
                  id: `${section.id}-sub-${Date.now()}`,
                  heading: 'New subsection',
                  level: (sub.level || section.level) + 1,
                  description: COMPONENT_DEFAULT_DESCRIPTIONS['prose'] || '',
                  componentType: 'prose',
                });
                onUpdate({ subsections: newSubsections });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OutlineTab({ form }: OutlineTabProps) {
  const [status, setStatus] = useState<GenerationStatus>(() =>
    form.formState.outline ? 'complete' : 'idle'
  );
  const [statusMessage, setStatusMessage] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  // Initialize with fallback components so dropdown works immediately
  const [components, setComponents] = useState<ComponentInfo[]>(() =>
    Object.entries(COMPONENT_TYPE_NAMES).map(([id, name]) => ({
      id: id as ComponentType,
      name,
      description: '',
      useCase: '',
    }))
  );

  // Use form state for persistence across tab changes
  const outlineText = form.formState.outlineText;
  const setOutlineText = form.setOutlineText;
  const outline = form.formState.outline;

  const { focusKeyword, targetCountry, language, articleTitle, articleSize, includeKeywords, structure, toplists } = form.formState;

  // Filter toplists that are marked for inclusion
  const includedToplists = (toplists || []).filter((t) => t.includeInArticle);

  const canGenerate = focusKeyword.trim().length > 0;

  // Create an empty outline if switching to structured mode without one
  const ensureOutlineExists = useCallback(() => {
    if (!outline) {
      const emptyOutline = {
        outlineId: `outline-${Date.now()}`,
        researchId: '',
        keyword: focusKeyword || 'New Article',
        title: articleTitle || focusKeyword || 'New Article',
        sections: [],
        metadata: {
          estimatedWordCount: 0,
          suggestedKeywords: [],
        },
        createdAt: new Date().toISOString(),
      };
      form.setOutline(emptyOutline);
      return emptyOutline;
    }
    return outline;
  }, [outline, focusKeyword, articleTitle, form]);

  // Fetch available components on mount
  useEffect(() => {
    async function fetchComponents() {
      // Fallback components in case API is unavailable
      const fallbackComponents: ComponentInfo[] = Object.entries(COMPONENT_TYPE_NAMES).map(([id, name]) => ({
        id: id as ComponentType,
        name,
        description: '',
        useCase: '',
      }));

      try {
        const result = await getComponents();
        if (result.success && result.data) {
          setComponents(result.data.components);
        } else {
          // API returned error, use fallback
          setComponents(fallbackComponents);
        }
      } catch (error) {
        console.error('Failed to fetch components:', error);
        setComponents(fallbackComponents);
      }
    }
    fetchComponents();
  }, []);

  const handleGenerateOutline = async () => {
    if (!canGenerate) return;

    setStatus('researching');
    setStatusMessage('Researching competitors and top-ranking content...');

    try {
      const result = await researchAndGenerateOutline(
        focusKeyword,
        targetCountry,
        {
          title: articleTitle || undefined,
          language: language,
          articleSize: articleSize,
          includeKeywords: includeKeywords.length > 0 ? includeKeywords : undefined,
          structure: structure,
        }
      );

      setStatus('generating');
      setStatusMessage('Analyzing content and generating outline...');

      // Convert outline to markdown text and store in form state
      const outlineMd = outlineToMarkdown(result.outline, structure, language, articleTitle);
      setOutlineText(outlineMd);
      form.setOutline(result.outline);

      setStatus('complete');
      setStatusMessage(`Generated from ${result.research.scrapedContent.length} competitor articles`);
      setViewMode('preview');
    } catch (error) {
      console.error('Outline generation failed:', error);
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to generate outline');
    }
  };

  // Update a section in the outline
  const updateSection = (sectionIndex: number, updates: Partial<OutlineSection>) => {
    if (!outline) return;

    const newSections = [...outline.sections];
    newSections[sectionIndex] = { ...newSections[sectionIndex], ...updates };

    const newOutline = { ...outline, sections: newSections };
    form.setOutline(newOutline);

    // Also update markdown text
    const outlineMd = outlineToMarkdown(newOutline, structure, language, articleTitle);
    setOutlineText(outlineMd);
  };

  // Delete a section from the outline
  const deleteSection = (sectionIndex: number) => {
    if (!outline) return;

    const newSections = outline.sections.filter((_, i) => i !== sectionIndex);
    const newOutline = { ...outline, sections: newSections };
    form.setOutline(newOutline);

    const outlineMd = outlineToMarkdown(newOutline, structure, language, articleTitle);
    setOutlineText(outlineMd);
  };

  // Add a new section
  const addSection = (afterIndex?: number) => {
    if (!outline) return;

    const newSection: OutlineSection = {
      id: `section-${Date.now()}`,
      heading: 'New section',
      level: 2,
      description: COMPONENT_DEFAULT_DESCRIPTIONS['prose'] || '',
      componentType: 'prose',
      suggestedWordCount: 300,
    };

    const newSections = [...outline.sections];
    if (afterIndex !== undefined) {
      newSections.splice(afterIndex + 1, 0, newSection);
    } else {
      newSections.push(newSection);
    }

    const newOutline = { ...outline, sections: newSections };
    form.setOutline(newOutline);

    const outlineMd = outlineToMarkdown(newOutline, structure, language, articleTitle);
    setOutlineText(outlineMd);
  };

  // Add a subsection to a section
  const addSubsection = (sectionIndex: number) => {
    if (!outline) return;

    const section = outline.sections[sectionIndex];
    const newSubsection: OutlineSection = {
      id: `${section.id}-sub-${Date.now()}`,
      heading: 'New subsection',
      level: 3,
      description: COMPONENT_DEFAULT_DESCRIPTIONS['prose'] || '',
      componentType: 'prose',
      suggestedWordCount: 150,
    };

    const newSubsections = [...(section.subsections || []), newSubsection];
    updateSection(sectionIndex, { subsections: newSubsections });
  };

  // Drag and drop handlers for reordering sections
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index || !outline) return;

    // Reorder sections
    const newSections = [...outline.sections];
    const draggedItem = newSections[draggedIndex];
    newSections.splice(draggedIndex, 1);
    newSections.splice(index, 0, draggedItem);

    const newOutline = { ...outline, sections: newSections };
    form.setOutline(newOutline);

    const outlineMd = outlineToMarkdown(newOutline, structure, language, articleTitle);
    setOutlineText(outlineMd);

    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'researching':
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const isGenerating = status === 'researching' || status === 'generating';

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Article Outline</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Generate an outline based on competitor research, or write your own.
          {articleTitle && (
            <span className="block mt-1">
              Title: <strong>"{articleTitle}"</strong> will influence the structure.
            </span>
          )}
        </p>
      </div>

      {/* Generation Context */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Keyword:</span>
          <span className="font-medium">{focusKeyword || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Language:</span>
          <span className="font-medium">{LANGUAGE_NAMES[language]}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Target Country:</span>
          <span className="font-medium">{targetCountry.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Article Size:</span>
          <span className="font-medium capitalize">{articleSize.preset}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sections:</span>
          <span className="font-medium">
            {[
              structure.keyTakeaways && 'Key Takeaways',
              structure.tableOfContents && 'TOC',
              structure.conclusion && 'Conclusion',
              structure.faqs && 'FAQs',
            ].filter(Boolean).join(', ') || 'Standard'}
          </span>
        </div>
        {includeKeywords.length > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Include Keywords:</span>
            <span className="font-medium">{includeKeywords.length} keywords</span>
          </div>
        )}
        {includedToplists.length > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Toplists:</span>
            <span className="font-medium text-primary">{includedToplists.length} included</span>
          </div>
        )}
      </div>

      {/* Generate Button & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          {statusMessage && (
            <span className={`text-sm ${status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
              {statusMessage}
            </span>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerateOutline}
          disabled={isGenerating || !canGenerate}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {status === 'researching' ? 'Researching...' : 'Generating...'}
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Outline
            </>
          )}
        </Button>
      </div>

      {/* Outline Editor/Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Outline</Label>
          <div className="flex gap-1">
              <Button
                variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('preview')}
                className="h-7 px-2"
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Preview
              </Button>
              <Button
                variant={viewMode === 'structured' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  ensureOutlineExists();
                  setViewMode('structured');
                }}
                className="h-7 px-2"
              >
                <List className="h-3.5 w-3.5 mr-1" />
                Structured
              </Button>
              <Button
                variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('edit')}
                className="h-7 px-2"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Markdown
              </Button>
            </div>
        </div>

        {viewMode === 'structured' && outline ? (
          <div className="min-h-[350px] space-y-3">
            {/* Add section button at top */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addSection()}
                className="h-7"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Section
              </Button>
            </div>

            {/* Section cards */}
            {outline.sections.map((section, idx) => (
              <div key={section.id || idx}>
                <SectionCard
                  section={section}
                  index={idx}
                  components={components}
                  isDragging={draggedIndex === idx}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onUpdate={(updates) => updateSection(idx, updates)}
                  onDelete={() => deleteSection(idx)}
                  onAddSubsection={() => addSubsection(idx)}
                />
                {/* Show toplist indicator after first section */}
                {idx === 0 && includedToplists.length > 0 && (
                  <ToplistIndicator toplists={includedToplists} />
                )}
              </div>
            ))}

            {outline.sections.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No sections yet. Click "Add Section" to get started.</p>
              </div>
            )}
          </div>
        ) : viewMode === 'edit' || !outlineText ? (
          <Textarea
            placeholder={`The outline will be generated based on:
• Keyword: "${focusKeyword || 'your focus keyword'}"
• Top-ranking competitor articles
• Your specified article length (${articleSize.preset})
${articleTitle ? `• Title structure: "${articleTitle}"` : ''}

Click "Generate Outline" to research competitors and create an optimized structure, or write your own outline using markdown:

## Section 1
- Point 1
- Point 2

## Section 2
...`}
            value={outlineText}
            onChange={(e) => setOutlineText(e.target.value)}
            className="min-h-[350px] font-mono text-sm"
          />
        ) : (
          <div className="min-h-[350px] rounded-md border bg-background p-4 overflow-auto prose prose-sm prose-invert max-w-none">
            {/* Show toplist indicator at top of preview if toplists are included */}
            {includedToplists.length > 0 && (
              <ToplistIndicator toplists={includedToplists} />
            )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-xl font-bold mb-4 mt-0 text-foreground">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-4 text-foreground">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-medium mb-1 mt-3 text-muted-foreground">{children}</h3>,
                h4: ({ children }) => <h4 className="text-sm font-medium mb-1 mt-2 text-muted-foreground">{children}</h4>,
                p: ({ children }) => <p className="mb-2 text-muted-foreground">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-2 text-muted-foreground">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 text-muted-foreground">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
              }}
            >
              {outlineText}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {viewMode === 'structured' ? (
          <>Use the structured editor to set component types for each section. Component types control how the AI formats the content (tables, FAQs, reviews, etc.).</>
        ) : (
          <>Use ## for main sections (H2) and ### for subsections (H3). Switch to "Structured" view to set component types.</>
        )}
      </p>
    </div>
  );
}

// Helper: Convert Outline object to markdown
function outlineToMarkdown(
  outline: Outline,
  structure?: { keyTakeaways?: boolean; tableOfContents?: boolean; conclusion?: boolean; faqs?: boolean },
  language: Language = 'en-US',
  userTitle?: string
): string {
  const lines: string[] = [];

  // Title - use outline.title, fall back to user-provided title, then keyword
  const title = outline.title || userTitle || outline.keyword;
  lines.push(`# ${title}`);
  lines.push('');

  // Key Takeaways (if enabled)
  if (structure?.keyTakeaways) {
    lines.push(`## ${getSectionTitle(language, 'keyTakeaways')}`);
    lines.push('');
  }

  // Table of Contents (if enabled)
  if (structure?.tableOfContents) {
    lines.push(`## ${getSectionTitle(language, 'toc')}`);
    lines.push('');
  }

  // Main Sections
  for (const section of outline.sections) {
    // level corresponds to HTML heading level: level 2 = ## (H2), level 3 = ### (H3)
    const headingPrefix = '#'.repeat(section.level);
    const componentTag = section.componentType && section.componentType !== 'prose'
      ? ` [${COMPONENT_TYPE_NAMES[section.componentType]}]`
      : '';
    lines.push(`${headingPrefix} ${section.heading}${componentTag}`);

    if (section.subsections && section.subsections.length > 0) {
      for (const sub of section.subsections) {
        // Subsections are one level deeper than their parent
        const subPrefix = '#'.repeat(sub.level || section.level + 1);
        const subComponentTag = sub.componentType && sub.componentType !== 'prose'
          ? ` [${COMPONENT_TYPE_NAMES[sub.componentType]}]`
          : '';
        lines.push(`${subPrefix} ${sub.heading}${subComponentTag}`);
      }
    }

    lines.push('');
  }

  // FAQs (if enabled)
  if (structure?.faqs) {
    lines.push(`## ${getSectionTitle(language, 'faqs')}`);
    lines.push('');
  }

  // Conclusion (if enabled)
  if (structure?.conclusion) {
    lines.push(`## ${getSectionTitle(language, 'conclusion')}`);
    lines.push('');
  }

  return lines.join('\n');
}
