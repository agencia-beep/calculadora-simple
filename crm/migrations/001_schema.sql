-- Leads: tabla principal del CRM
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id INTEGER,         -- ID original de LeadFinder
  place_id TEXT,

  -- Info del negocio
  business_name TEXT NOT NULL,
  niche TEXT,
  category TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  email TEXT,
  website TEXT,
  rating REAL,
  reviews_count INTEGER DEFAULT 0,
  maps_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  linkedin_url TEXT,
  owner_name TEXT,

  -- Diagnóstico
  website_status TEXT,
  score INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'Media',
  diagnosis TEXT,
  marketing_gaps TEXT,
  detected_language TEXT DEFAULT 'es',

  -- CRM pipeline
  stage TEXT DEFAULT 'nuevo',
  -- nuevo | contactado | respondio | propuesta | negociacion | cliente | sin_interes | reimpactar

  service_interest TEXT,
  -- web | landing | logo | marketing | app | otro

  deal_value REAL DEFAULT 0,
  deal_notes TEXT,

  -- Seguimiento
  last_contact_at TEXT,
  next_followup_at TEXT,
  contacted_at TEXT,
  responded_at TEXT,
  closed_at TEXT,

  -- Secuencia
  sequence_step INTEGER DEFAULT 0,
  sequence_paused INTEGER DEFAULT 0,

  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Notas por lead
CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Actividades / timeline por lead
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  -- email_sent | call_made | note_added | stage_changed | followup_sent | responded | deal_created
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_niche ON leads(niche);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_notes_lead ON notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
