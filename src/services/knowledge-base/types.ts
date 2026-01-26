export interface OfficialSourceLink {
  value: string;
  value_citation: string;
}

export interface GamblingAuthority {
  name: string;
  name_citation: string;
  role: string;
  role_citation: string;
  current_regulations: string;
  current_regulations_citation: string;
  upcoming_legislative_changes: string;
  upcoming_legislative_changes_citation: string;
  official_source_links: OfficialSourceLink[];
}

export interface GamblingAuthoritiesFile {
  gambling_authorities: GamblingAuthority[];
}

export interface KnowledgeBaseEntry {
  content: string;
  citation?: string;
  category: string;
  entityName: string;
  country: string;
  field: string;
}

// Locale file types
export interface LocaleFile {
  meta: {
    market_code: string;
    language_code: string;
    language_name: string;
    country_name: string;
    currency: string;
    date_format: string;
  };
  regulatory?: {
    primary_authority?: {
      id: string;
      name: string;
      name_en: string;
      url: string;
      description: string;
    };
    self_exclusion_system?: {
      id: string;
      name: string;
      url: string;
      description: string;
      periods?: string[];
    };
    help_resources?: Array<{
      id: string;
      name: string;
      url: string;
      phone?: string;
      description: string;
    }>;
    tax_rules?: {
      eu_licensed?: string;
      non_eu_licensed?: string;
      declaration_note?: string;
      example?: string;
    };
    legal_framework?: {
      gambling_act_year: number;
      gambling_act_name: string;
      player_responsibility: string;
    };
  };
  faq_common_questions?: string[];
  methodology_criteria?: Record<string, {
    name: string;
    weight: string;
    description: string;
  }>;
  // Other fields we don't need to type fully
  [key: string]: unknown;
}
