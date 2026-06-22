-- ============================================================
-- BASE DE DONNÉES COMPLÈTE : Système de Gestion des Licences
-- Province de Khémisset — Maroc
-- PostgreSQL 16
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin','agent','citizen');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE licence_type_enum AS ENUM ('pharmacie','cafe_restaurant','hopital_clinique','ecole_privee','salle_sport');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE source_enum AS ENUM ('citizen','agent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE role_uploader_enum AS ENUM ('citizen','agent','admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE workflow_event_type AS ENUM (
    'demande_deposee','fichier_recu','examen_en_cours',
    'fichier_rejete','fichier_corrige','decision_imprimee',
    'transmis_au_chef','approuve','rejete'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE trigger_role_enum AS ENUM ('citizen','agent','admin','system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE doc_type_enum AS ENUM ('decision');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- TABLE USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                   SERIAL PRIMARY KEY,
  username             VARCHAR(50) UNIQUE NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,
  full_name            VARCHAR(255),
  phone                VARCHAR(50) NULL,
  email                VARCHAR(255) UNIQUE NOT NULL,
  role                 user_role DEFAULT 'agent',
  is_active            SMALLINT DEFAULT 0,
  reset_token          VARCHAR(255) NULL,
  reset_token_expires  TIMESTAMP NULL,
  approved_by          INT NULL,
  approved_at          TIMESTAMP NULL,
  deleted_at           TIMESTAMP NULL,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email               ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_reset_token          ON users (reset_token);
CREATE INDEX IF NOT EXISTS idx_users_approved_by          ON users (approved_by);
CREATE INDEX IF NOT EXISTS idx_users_role_active          ON users (role, is_active);
CREATE INDEX IF NOT EXISTS idx_users_role_active_deleted  ON users (role, is_active, deleted_at);

-- Comptes par défaut (admin / mohcin123 | agent1 / agent123)
INSERT INTO users (username, password_hash, full_name, email, role, is_active) VALUES
('admin',    '$2a$10$bsCf3YBILfT65AdQ4Ea2SurGWUeiS7XLtdL.UVZgg67DGx2FM7xta', 'Administrateur', 'ahabchanmohcin@gmail.com', 'admin',   1),
('agent1',   '$2a$10$qxgXFY9DBFlahAAJyIZ84u/xy6Wxn34s37xsPadW1o0gP2PdXJfOa', 'Agent Test',     'agent1@khemisset.gov.ma',   'agent',   1)
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- TABLE DEMANDES
-- ============================================================
CREATE TABLE IF NOT EXISTS demandes (
  id              SERIAL PRIMARY KEY,
  numero_dossier  VARCHAR(30) UNIQUE NOT NULL,
  licence_type    licence_type_enum NOT NULL DEFAULT 'pharmacie',
  extra_data      JSONB NULL,
  nom_complet     VARCHAR(255) NOT NULL,
  cin             VARCHAR(20)  NOT NULL,
  date_naissance  DATE,
  universite      VARCHAR(255),
  diplome         VARCHAR(255),
  adresse_complete TEXT,
  date_demande    DATE,
  date_izin       DATE,
  numero_izin     VARCHAR(50),
  nom_massah      VARCHAR(255),
  date_massah     DATE,
  date_lajna      DATE,
  commune         VARCHAR(150) NOT NULL,
  cercle          VARCHAR(150) NOT NULL,
  created_by          INT,
  source              source_enum DEFAULT 'agent',
  citizen_user_id     INT NULL,
  citizen_email       VARCHAR(255) NULL,
  nom_pharmacie       VARCHAR(255),
  statut              VARCHAR(40)  NOT NULL DEFAULT 'en_cours_analyse',
  motif_rejet_fichier TEXT NULL,
  notes               TEXT,
  date_creation       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_modification   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cin                        ON demandes (cin);
CREATE INDEX IF NOT EXISTS idx_numero_dossier             ON demandes (numero_dossier);
CREATE INDEX IF NOT EXISTS idx_commune                    ON demandes (commune);
CREATE INDEX IF NOT EXISTS idx_cercle                     ON demandes (cercle);
CREATE INDEX IF NOT EXISTS idx_statut                     ON demandes (statut);
CREATE INDEX IF NOT EXISTS idx_date_creation              ON demandes (date_creation);
CREATE INDEX IF NOT EXISTS idx_created_by                 ON demandes (created_by);
CREATE INDEX IF NOT EXISTS idx_source                     ON demandes (source);
CREATE INDEX IF NOT EXISTS idx_citizen_user_id            ON demandes (citizen_user_id);
CREATE INDEX IF NOT EXISTS idx_demandes_licence_type      ON demandes (licence_type);
CREATE INDEX IF NOT EXISTS idx_demandes_commune_statut    ON demandes (commune, statut);
CREATE INDEX IF NOT EXISTS idx_demandes_cercle_statut     ON demandes (cercle, statut);
CREATE INDEX IF NOT EXISTS idx_demandes_date_statut       ON demandes (date_creation, statut);

-- ============================================================
-- TABLE DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id              SERIAL PRIMARY KEY,
  demande_id      INT NOT NULL,
  type_doc        doc_type_enum NOT NULL,
  nom_fichier     VARCHAR(255),
  date_generation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (demande_id) REFERENCES demandes(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE PIECES_JOINTES
-- ============================================================
CREATE TABLE IF NOT EXISTS pieces_jointes (
  id             SERIAL PRIMARY KEY,
  demande_id     INT NOT NULL,
  uploaded_by    INT NULL,
  role_uploader  role_uploader_enum NOT NULL DEFAULT 'agent',
  nom_original   VARCHAR(255) NOT NULL,
  nom_stockage   VARCHAR(255) NOT NULL,
  type_mime      VARCHAR(100) NOT NULL,
  taille_octets  BIGINT NOT NULL,
  type_piece     VARCHAR(100) NULL,
  date_upload    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (demande_id)  REFERENCES demandes(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)   ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pj_demande  ON pieces_jointes (demande_id);
CREATE INDEX IF NOT EXISTS idx_pj_uploader ON pieces_jointes (uploaded_by);

-- ============================================================
-- TABLE AUDIT_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT,
  user_name   VARCHAR(200),
  action      VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id   INT,
  details     TEXT,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_user       ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action     ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs (created_at);

-- ============================================================
-- TABLE WORKFLOW_EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_events (
  id                SERIAL PRIMARY KEY,
  demande_id        INT NOT NULL,
  event_type        workflow_event_type NOT NULL,
  triggered_by      INT NULL,
  triggered_by_role trigger_role_enum DEFAULT 'system',
  message           TEXT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (demande_id)   REFERENCES demandes(id) ON DELETE CASCADE,
  FOREIGN KEY (triggered_by) REFERENCES users(id)   ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wf_demande ON workflow_events (demande_id);
CREATE INDEX IF NOT EXISTS idx_wf_created ON workflow_events (created_at);

-- ============================================================
-- TABLE NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL,
  demande_id INT NULL,
  type       VARCHAR(50)  NOT NULL,
  titre      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  is_read    SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (demande_id) REFERENCES demandes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications (is_read);

-- ============================================================
-- TABLE WORKFLOW_HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_history (
  id               BIGSERIAL PRIMARY KEY,
  demande_id       INT NOT NULL,
  ancien_statut    VARCHAR(40) NULL,
  nouveau_statut   VARCHAR(40) NOT NULL,
  action           VARCHAR(120) NOT NULL,
  commentaire      TEXT NULL,
  raison_rejet     TEXT NULL,
  utilisateur_id   INT NULL,
  utilisateur_nom  VARCHAR(255) NULL,
  role_utilisateur VARCHAR(50) NULL,
  date_action      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  temps_traitement INT NULL,
  FOREIGN KEY (demande_id)     REFERENCES demandes(id) ON DELETE CASCADE,
  FOREIGN KEY (utilisateur_id) REFERENCES users(id)   ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wh_demande_date  ON workflow_history (demande_id, date_action);
CREATE INDEX IF NOT EXISTS idx_wh_actor         ON workflow_history (utilisateur_id, date_action);
CREATE INDEX IF NOT EXISTS idx_wf_actor_event   ON workflow_history (utilisateur_id, role_utilisateur, action, date_action);

-- ============================================================
-- TABLE LICENCE_CONFIGS
-- ============================================================
CREATE TABLE IF NOT EXISTS licence_configs (
  id                SERIAL PRIMARY KEY,
  licence_type      VARCHAR(50) UNIQUE NOT NULL,
  label_fr          VARCHAR(100),
  label_ar          VARCHAR(100),
  documents_requis  JSONB,
  champs_formulaire JSONB,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_licence_configs_type ON licence_configs (licence_type);

-- ── Config Pharmacie ────────────────────────────────────────
INSERT INTO licence_configs (licence_type, label_fr, label_ar, documents_requis, champs_formulaire) VALUES (
  'pharmacie', 'Licence de Pharmacie', 'رخصة الصيدلية',
  '[
    {"key":"cin_proprietaire","label_fr":"CIN du propriétaire","label_ar":"بطاقة التعريف للمالك","ocr_enabled":true},
    {"key":"diplome_pharmacie","label_fr":"Diplôme de pharmacie","label_ar":"دبلوم الصيدلة","ocr_enabled":true},
    {"key":"permis_exercice","label_fr":"Permis d'\''exercice","label_ar":"رخصة المزاولة","ocr_enabled":true},
    {"key":"certificat_distance","label_fr":"Certificat de distance","label_ar":"شهادة المسافة","ocr_enabled":false},
    {"key":"pv_commission","label_fr":"PV de la commission","label_ar":"محضر اللجنة","ocr_enabled":false}
  ]'::jsonb,
  '[
    {"key":"nom_complet","label_fr":"Nom complet","label_ar":"الاسم الكامل","type":"text","required":true,"section":"identite"},
    {"key":"cin","label_fr":"Numéro CIN","label_ar":"رقم بطاقة التعريف","type":"text","required":true,"section":"identite"},
    {"key":"date_naissance","label_fr":"Date de naissance","label_ar":"تاريخ الازدياد","type":"date","required":true,"section":"identite"},
    {"key":"universite","label_fr":"Université","label_ar":"الجامعة","type":"text","required":false,"section":"formation"},
    {"key":"diplome","label_fr":"Diplôme","label_ar":"الشهادة","type":"text","required":false,"section":"formation"},
    {"key":"adresse_complete","label_fr":"Adresse complète","label_ar":"العنوان الكامل","type":"textarea","required":true,"section":"localisation"},
    {"key":"commune","label_fr":"Commune","label_ar":"الجماعة","type":"text","required":true,"section":"localisation"},
    {"key":"cercle","label_fr":"Cercle","label_ar":"الدائرة","type":"text","required":true,"section":"localisation"},
    {"key":"nom_pharmacie","label_fr":"Nom de la pharmacie","label_ar":"اسم الصيدلية","type":"text","required":true,"section":"etablissement"},
    {"key":"date_izin","label_fr":"Date izin","label_ar":"تاريخ الإذن","type":"date","required":false,"section":"autorisation"},
    {"key":"numero_izin","label_fr":"Numéro izin","label_ar":"رقم الإذن","type":"text","required":false,"section":"autorisation"}
  ]'::jsonb
) ON CONFLICT (licence_type) DO NOTHING;

-- ── Config Café / Restaurant ────────────────────────────────
INSERT INTO licence_configs (licence_type, label_fr, label_ar, documents_requis, champs_formulaire) VALUES (
  'cafe_restaurant', 'Licence Café / Restaurant', 'رخصة المقهى / المطعم',
  '[
    {"key":"cin_proprietaire","label_fr":"CIN du propriétaire","label_ar":"بطاقة التعريف للمالك","ocr_enabled":true},
    {"key":"certificat_propriete_bail","label_fr":"Certificat de propriété ou bail","label_ar":"شهادة الملكية أو عقد الكراء","ocr_enabled":true},
    {"key":"certificat_medical","label_fr":"Certificat médical","label_ar":"الشهادة الطبية","ocr_enabled":false},
    {"key":"casier_judiciaire","label_fr":"Extrait de casier judiciaire","label_ar":"مستخرج السجل العدلي","ocr_enabled":false},
    {"key":"plan_locaux","label_fr":"Plan des locaux","label_ar":"مخطط المحل","ocr_enabled":false},
    {"key":"attestation_conformite_sanitaire","label_fr":"Attestation conformité sanitaire","label_ar":"شهادة المطابقة الصحية","ocr_enabled":false}
  ]'::jsonb,
  '[
    {"key":"nom","label_fr":"Nom","label_ar":"الاسم العائلي","type":"text","required":true,"section":"identite"},
    {"key":"prenom","label_fr":"Prénom","label_ar":"الاسم الشخصي","type":"text","required":true,"section":"identite"},
    {"key":"cin","label_fr":"Numéro CIN","label_ar":"رقم بطاقة التعريف","type":"text","required":true,"section":"identite"},
    {"key":"date_naissance","label_fr":"Date de naissance","label_ar":"تاريخ الازدياد","type":"date","required":true,"section":"identite"},
    {"key":"adresse_proprietaire","label_fr":"Adresse du propriétaire","label_ar":"عنوان المالك","type":"textarea","required":true,"section":"identite"},
    {"key":"adresse_local","label_fr":"Adresse du local","label_ar":"عنوان المحل","type":"textarea","required":true,"section":"etablissement"},
    {"key":"superficie","label_fr":"Superficie (m²)","label_ar":"المساحة (م²)","type":"number","required":true,"section":"etablissement"},
    {"key":"capacite_places","label_fr":"Capacité (nombre de places)","label_ar":"الطاقة الاستيعابية (مقاعد)","type":"number","required":true,"section":"etablissement"},
    {"key":"type_etablissement","label_fr":"Type d'\''établissement","label_ar":"نوع المؤسسة","type":"select","required":true,"section":"etablissement","options":["café","restaurant","café-restaurant"]},
    {"key":"telephone","label_fr":"Téléphone","label_ar":"الهاتف","type":"tel","required":false,"section":"contact"},
    {"key":"email","label_fr":"Email","label_ar":"البريد الإلكتروني","type":"email","required":false,"section":"contact"}
  ]'::jsonb
) ON CONFLICT (licence_type) DO NOTHING;

-- ── Config Hôpital / Clinique ───────────────────────────────
INSERT INTO licence_configs (licence_type, label_fr, label_ar, documents_requis, champs_formulaire) VALUES (
  'hopital_clinique', 'Licence Hôpital / Clinique', 'رخصة المستشفى / العيادة',
  '[
    {"key":"cin_directeur_medical","label_fr":"CIN du directeur médical","label_ar":"بطاقة التعريف للمدير الطبي","ocr_enabled":true},
    {"key":"diplome_medecine","label_fr":"Diplôme de médecine","label_ar":"دبلوم الطب","ocr_enabled":true},
    {"key":"autorisation_exercice","label_fr":"Autorisation d'\''exercice médical","label_ar":"رخصة مزاولة الطب","ocr_enabled":true},
    {"key":"bail_locaux","label_fr":"Certificat de propriété / bail locaux","label_ar":"عقد الملكية / كراء المحل","ocr_enabled":true},
    {"key":"plans_architecturaux","label_fr":"Plans architecturaux approuvés","label_ar":"المخططات المعمارية المعتمدة","ocr_enabled":false},
    {"key":"attestation_nombre_lits","label_fr":"Attestation du nombre de lits","label_ar":"شهادة عدد الأسرة","ocr_enabled":false},
    {"key":"liste_personnel_medical","label_fr":"Liste du personnel médical","label_ar":"قائمة الطاقم الطبي","ocr_enabled":false},
    {"key":"certificat_conformite_equip","label_fr":"Certificat conformité des équipements","label_ar":"شهادة مطابقة التجهيزات الطبية","ocr_enabled":false}
  ]'::jsonb,
  '[
    {"key":"nom_directeur","label_fr":"Nom du directeur médical","label_ar":"اسم المدير الطبي","type":"text","required":true,"section":"identite"},
    {"key":"prenom_directeur","label_fr":"Prénom du directeur médical","label_ar":"الاسم الشخصي للمدير الطبي","type":"text","required":true,"section":"identite"},
    {"key":"cin_directeur","label_fr":"CIN du directeur","label_ar":"بطاقة التعريف للمدير","type":"text","required":true,"section":"identite"},
    {"key":"specialite","label_fr":"Spécialité médicale","label_ar":"التخصص الطبي","type":"text","required":true,"section":"identite"},
    {"key":"numero_autorisation","label_fr":"N° autorisation d'\''exercice","label_ar":"رقم ترخيص الممارسة","type":"text","required":false,"section":"autorisation"},
    {"key":"nom_clinique","label_fr":"Nom de la clinique","label_ar":"اسم العيادة / المستشفى","type":"text","required":true,"section":"etablissement"},
    {"key":"adresse","label_fr":"Adresse","label_ar":"العنوان","type":"textarea","required":true,"section":"etablissement"},
    {"key":"superficie","label_fr":"Superficie (m²)","label_ar":"المساحة (م²)","type":"number","required":true,"section":"etablissement"},
    {"key":"nombre_lits","label_fr":"Nombre de lits","label_ar":"عدد الأسرة","type":"number","required":true,"section":"etablissement"},
    {"key":"type_clinique","label_fr":"Type de clinique","label_ar":"نوع العيادة","type":"select","required":true,"section":"etablissement","options":["générale","spécialisée","centre soins"]},
    {"key":"specialites_proposees","label_fr":"Spécialités proposées","label_ar":"التخصصات المقدمة","type":"array","required":false,"section":"etablissement"},
    {"key":"telephone","label_fr":"Téléphone","label_ar":"الهاتف","type":"tel","required":false,"section":"contact"},
    {"key":"email","label_fr":"Email","label_ar":"البريد الإلكتروني","type":"email","required":false,"section":"contact"}
  ]'::jsonb
) ON CONFLICT (licence_type) DO NOTHING;

-- ── Config École Privée ─────────────────────────────────────
INSERT INTO licence_configs (licence_type, label_fr, label_ar, documents_requis, champs_formulaire) VALUES (
  'ecole_privee', 'Licence École Privée', 'رخصة المدرسة الخاصة',
  '[
    {"key":"cin_directeur","label_fr":"CIN du directeur","label_ar":"بطاقة التعريف للمدير","ocr_enabled":true},
    {"key":"diplome_directeur","label_fr":"Diplôme du directeur","label_ar":"دبلوم المدير","ocr_enabled":true},
    {"key":"bail_propriete","label_fr":"Certificat de propriété / bail","label_ar":"عقد الملكية / الكراء","ocr_enabled":true},
    {"key":"plans_locaux","label_fr":"Plans des locaux approuvés","label_ar":"مخططات المحلات المعتمدة","ocr_enabled":false},
    {"key":"liste_enseignants","label_fr":"Liste des enseignants avec diplômes","label_ar":"قائمة الأساتذة مع الشهادات","ocr_enabled":false},
    {"key":"attestation_conformite_salles","label_fr":"Attestation conformité des salles","label_ar":"شهادة مطابقة القاعات الدراسية","ocr_enabled":false}
  ]'::jsonb,
  '[
    {"key":"nom_directeur","label_fr":"Nom du directeur","label_ar":"اسم المدير","type":"text","required":true,"section":"identite"},
    {"key":"prenom_directeur","label_fr":"Prénom du directeur","label_ar":"الاسم الشخصي للمدير","type":"text","required":true,"section":"identite"},
    {"key":"cin_directeur","label_fr":"CIN du directeur","label_ar":"بطاقة التعريف للمدير","type":"text","required":true,"section":"identite"},
    {"key":"diplome_directeur","label_fr":"Diplôme du directeur","label_ar":"دبلوم المدير","type":"text","required":true,"section":"formation"},
    {"key":"experience_annees","label_fr":"Expérience (années)","label_ar":"الخبرة (سنوات)","type":"number","required":false,"section":"formation"},
    {"key":"nom_ecole","label_fr":"Nom de l'\''école","label_ar":"اسم المدرسة","type":"text","required":true,"section":"etablissement"},
    {"key":"adresse","label_fr":"Adresse","label_ar":"العنوان","type":"textarea","required":true,"section":"etablissement"},
    {"key":"superficie_totale","label_fr":"Superficie totale (m²)","label_ar":"المساحة الإجمالية (م²)","type":"number","required":true,"section":"etablissement"},
    {"key":"cycle","label_fr":"Cycle d'\''enseignement","label_ar":"مستوى التعليم","type":"select","required":true,"section":"etablissement","options":["préscolaire","primaire","collège","lycée","multi-cycles"]},
    {"key":"nombre_classes","label_fr":"Nombre de classes","label_ar":"عدد الأقسام","type":"number","required":true,"section":"etablissement"},
    {"key":"capacite_eleves","label_fr":"Capacité élèves max","label_ar":"الطاقة الاستيعابية للتلاميذ","type":"number","required":true,"section":"etablissement"},
    {"key":"telephone","label_fr":"Téléphone","label_ar":"الهاتف","type":"tel","required":false,"section":"contact"},
    {"key":"email","label_fr":"Email","label_ar":"البريد الإلكتروني","type":"email","required":false,"section":"contact"}
  ]'::jsonb
) ON CONFLICT (licence_type) DO NOTHING;

-- ── Config Salle de Sport ───────────────────────────────────
INSERT INTO licence_configs (licence_type, label_fr, label_ar, documents_requis, champs_formulaire) VALUES (
  'salle_sport', 'Licence Salle de Sport', 'رخصة قاعة الرياضة',
  '[
    {"key":"cin_proprietaire","label_fr":"CIN du propriétaire","label_ar":"بطاقة التعريف للمالك","ocr_enabled":true},
    {"key":"bail_propriete","label_fr":"Certificat de propriété / bail","label_ar":"عقد الملكية / الكراء","ocr_enabled":true},
    {"key":"diplome_education_physique","label_fr":"Diplôme éducation physique / coaching","label_ar":"دبلوم التربية البدنية / التدريب","ocr_enabled":true},
    {"key":"attestation_conformite_equip","label_fr":"Attestation conformité équipements","label_ar":"شهادة مطابقة المعدات الرياضية","ocr_enabled":false},
    {"key":"plan_locaux","label_fr":"Plan des locaux","label_ar":"مخطط القاعة","ocr_enabled":false},
    {"key":"certificat_medical_responsable","label_fr":"Certificat médical du responsable","label_ar":"الشهادة الطبية للمسؤول","ocr_enabled":false}
  ]'::jsonb,
  '[
    {"key":"nom","label_fr":"Nom","label_ar":"الاسم العائلي","type":"text","required":true,"section":"identite"},
    {"key":"prenom","label_fr":"Prénom","label_ar":"الاسم الشخصي","type":"text","required":true,"section":"identite"},
    {"key":"cin","label_fr":"Numéro CIN","label_ar":"رقم بطاقة التعريف","type":"text","required":true,"section":"identite"},
    {"key":"qualification_sportive","label_fr":"Qualification sportive","label_ar":"المؤهل الرياضي","type":"text","required":true,"section":"formation"},
    {"key":"nom_salle","label_fr":"Nom de la salle","label_ar":"اسم القاعة","type":"text","required":true,"section":"etablissement"},
    {"key":"adresse","label_fr":"Adresse","label_ar":"العنوان","type":"textarea","required":true,"section":"etablissement"},
    {"key":"superficie","label_fr":"Superficie (m²)","label_ar":"المساحة (م²)","type":"number","required":true,"section":"etablissement"},
    {"key":"type_activites","label_fr":"Type d'\''activités","label_ar":"نوع الأنشطة","type":"select","required":true,"section":"etablissement","options":["musculation","arts martiaux","yoga","fitness","multi-activités"]},
    {"key":"capacite_membres","label_fr":"Capacité membres max","label_ar":"الطاقة الاستيعابية للأعضاء","type":"number","required":true,"section":"etablissement"},
    {"key":"equipements_disponibles","label_fr":"Équipements disponibles","label_ar":"التجهيزات المتوفرة","type":"textarea","required":false,"section":"etablissement"},
    {"key":"telephone","label_fr":"Téléphone","label_ar":"الهاتف","type":"tel","required":false,"section":"contact"},
    {"key":"email","label_fr":"Email","label_ar":"البريد الإلكتروني","type":"email","required":false,"section":"contact"}
  ]'::jsonb
) ON CONFLICT (licence_type) DO NOTHING;

-- ============================================================
-- TRIGGER: auto-update date_modification on demandes
-- ============================================================
CREATE OR REPLACE FUNCTION update_modification_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_modification = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_demandes_modification ON demandes;
CREATE TRIGGER trg_demandes_modification
  BEFORE UPDATE ON demandes
  FOR EACH ROW
  EXECUTE FUNCTION update_modification_timestamp();

-- ============================================================
-- CONFIRMATION
-- ============================================================
SELECT
  'kh_data créée avec succès' AS statut,
  (SELECT COUNT(*) FROM users) AS nb_users,
  (SELECT COUNT(*) FROM licence_configs) AS nb_licence_configs;
