-- ============================================================
-- BASE DE DONNÉES COMPLÈTE : Système de Gestion des Licences
-- Province de Khémisset — Maroc
-- Contient : schéma initial + migrations v2, v3, v4
-- ============================================================

CREATE DATABASE IF NOT EXISTS kh_data
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kh_data;

-- ============================================================
-- SUPPRESSION DES TABLES (ordre inverse des dépendances)
-- ============================================================
DROP TABLE IF EXISTS pieces_jointes;
DROP TABLE IF EXISTS workflow_history;
DROP TABLE IF EXISTS workflow_events;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS licence_configs;
DROP TABLE IF EXISTS demandes;
DROP TABLE IF EXISTS users;

-- ============================================================
-- TABLE USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  username             VARCHAR(50) UNIQUE NOT NULL,
  password_hash        VARCHAR(255) NOT NULL,
  full_name            VARCHAR(255),
  phone                VARCHAR(50) NULL,
  email                VARCHAR(255) UNIQUE NOT NULL,
  role                 ENUM('admin','agent','citizen') DEFAULT 'agent',
  is_active            TINYINT DEFAULT 0,
  reset_token          VARCHAR(255) NULL,
  reset_token_expires  DATETIME NULL,
  approved_by          INT NULL,
  approved_at          DATETIME NULL,
  deleted_at           DATETIME NULL,
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email              (email),
  INDEX idx_users_reset_token        (reset_token),
  INDEX idx_users_approved_by        (approved_by),
  INDEX idx_users_role_active        (role, is_active),
  INDEX idx_users_role_active_deleted(role, is_active, deleted_at),
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comptes par défaut  (admin / admin123 | agent1 / agent123)
INSERT INTO users (username, password_hash, full_name, email, role, is_active) VALUES
('admin',    '$2a$10$uHPk/xFXEPPMzI8Fo8D.U.Kq2Vai69aWkQpoEfZgUv6AcCmD6UndG', 'Administrateur', 'admin@khemisset.gov.ma',    'admin',   1),
('agent1',   '$2a$10$qxgXFY9DBFlahAAJyIZ84u/xy6Wxn34s37xsPadW1o0gP2PdXJfOa', 'Agent Test',     'agent1@khemisset.gov.ma',   'agent',   1);

-- ============================================================
-- TABLE DEMANDES
-- ============================================================
CREATE TABLE IF NOT EXISTS demandes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  numero_dossier  VARCHAR(30) UNIQUE NOT NULL,

  -- [v4] Type de licence (DEFAULT pharmacie = rétrocompatible)
  licence_type    ENUM('pharmacie','cafe_restaurant','hopital_clinique','ecole_privee','salle_sport')
                  NOT NULL DEFAULT 'pharmacie'
                  COMMENT 'Type de licence demandée',

  -- [v4] Données spécifiques au type (JSON)
  extra_data      JSON NULL
                  COMMENT 'Champs spécifiques selon le type de licence',

  -- Champs communs (identité du demandeur)
  nom_complet     VARCHAR(255) NOT NULL,
  cin             VARCHAR(20)  NOT NULL,
  date_naissance  DATE,
  universite      VARCHAR(255),
  diplome         VARCHAR(255),
  adresse_complete TEXT,

  -- Données du dossier pharmacie (conservées pour compatibilité)
  date_demande    DATE,
  date_izin       DATE,
  numero_izin     VARCHAR(50),
  nom_massah      VARCHAR(255),
  date_massah     DATE,
  date_lajna      DATE,

  -- Localisation
  commune         VARCHAR(150) NOT NULL,
  cercle          VARCHAR(150) NOT NULL,

  -- Méta
  created_by          INT,
  source              ENUM('citizen','agent') DEFAULT 'agent',
  citizen_user_id     INT NULL,
  citizen_email       VARCHAR(255) NULL
                      COMMENT 'Email citoyen (copie pour demandes sans compte)',
  nom_pharmacie       VARCHAR(255),
  statut              VARCHAR(40)  NOT NULL DEFAULT 'en_cours_analyse',
  motif_rejet_fichier TEXT NULL,
  notes               TEXT,
  date_creation       DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_modification   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_cin                        (cin),
  INDEX idx_numero_dossier             (numero_dossier),
  INDEX idx_commune                    (commune),
  INDEX idx_cercle                     (cercle),
  INDEX idx_statut                     (statut),
  INDEX idx_date_creation              (date_creation),
  INDEX idx_created_by                 (created_by),
  INDEX idx_source                     (source),
  INDEX idx_citizen_user_id            (citizen_user_id),
  INDEX idx_demandes_licence_type      (licence_type),
  INDEX idx_demandes_commune_statut    (commune, statut),
  INDEX idx_demandes_cercle_statut     (cercle, statut),
  INDEX idx_demandes_date_statut       (date_creation, statut),
  FOREIGN KEY (created_by)      REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (citizen_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  demande_id      INT NOT NULL,
  type_doc        ENUM('decision') NOT NULL,
  nom_fichier     VARCHAR(255),
  date_generation DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (demande_id) REFERENCES demandes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE PIECES_JOINTES  [v2]
-- ============================================================
CREATE TABLE IF NOT EXISTS pieces_jointes (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  demande_id     INT NOT NULL,
  uploaded_by    INT NULL                       COMMENT 'Utilisateur ayant téléversé le fichier',
  role_uploader  ENUM('citizen','agent','admin') NOT NULL DEFAULT 'agent',
  nom_original   VARCHAR(255) NOT NULL          COMMENT 'Nom original du fichier',
  nom_stockage   VARCHAR(255) NOT NULL          COMMENT 'Nom sur disque (UUID + extension)',
  type_mime      VARCHAR(100) NOT NULL,
  taille_octets  INT UNSIGNED NOT NULL,
  type_piece     VARCHAR(100) NULL              COMMENT 'Ex: cin, diplome, bail, plan...',
  date_upload    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (demande_id)  REFERENCES demandes(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)   ON DELETE SET NULL,
  INDEX idx_pj_demande  (demande_id),
  INDEX idx_pj_uploader (uploaded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE AUDIT_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  user_name   VARCHAR(200),
  action      VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id   INT,
  details     TEXT,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user       (user_id),
  INDEX idx_audit_action     (action),
  INDEX idx_audit_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE WORKFLOW_EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_events (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  demande_id        INT NOT NULL,
  event_type        ENUM(
                      'demande_deposee','fichier_recu','examen_en_cours',
                      'fichier_rejete','fichier_corrige','decision_imprimee',
                      'transmis_au_chef','approuve','rejete'
                    ) NOT NULL,
  triggered_by      INT NULL,
  triggered_by_role ENUM('citizen','agent','admin','system') DEFAULT 'system',
  message           TEXT NULL,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (demande_id)   REFERENCES demandes(id) ON DELETE CASCADE,
  FOREIGN KEY (triggered_by) REFERENCES users(id)   ON DELETE SET NULL,
  INDEX idx_wf_demande (demande_id),
  INDEX idx_wf_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  demande_id INT NULL,
  type       VARCHAR(50)  NOT NULL,
  titre      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  is_read    TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (demande_id) REFERENCES demandes(id) ON DELETE SET NULL,
  INDEX idx_notif_user (user_id),
  INDEX idx_notif_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE WORKFLOW_HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_history (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  demande_id       INT NOT NULL,
  ancien_statut    VARCHAR(40) NULL,
  nouveau_statut   VARCHAR(40) NOT NULL,
  action           VARCHAR(120) NOT NULL,
  commentaire      TEXT NULL,
  raison_rejet     TEXT NULL,
  utilisateur_id   INT NULL,
  utilisateur_nom  VARCHAR(255) NULL,
  role_utilisateur VARCHAR(50) NULL,
  date_action      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  temps_traitement INT NULL COMMENT 'Secondes depuis la ligne historique précédente',
  FOREIGN KEY (demande_id)     REFERENCES demandes(id) ON DELETE CASCADE,
  FOREIGN KEY (utilisateur_id) REFERENCES users(id)   ON DELETE SET NULL,
  INDEX idx_wh_demande_date  (demande_id, date_action),
  INDEX idx_wh_actor         (utilisateur_id, date_action),
  INDEX idx_wf_actor_event   (utilisateur_id, role_utilisateur, action, date_action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE LICENCE_CONFIGS  [v4]
-- ============================================================
CREATE TABLE IF NOT EXISTS licence_configs (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  licence_type      VARCHAR(50) UNIQUE NOT NULL  COMMENT 'Clé technique = valeur ENUM demandes.licence_type',
  label_fr          VARCHAR(100)                 COMMENT 'Libellé français',
  label_ar          VARCHAR(100)                 COMMENT 'Libellé arabe',
  documents_requis  JSON                         COMMENT 'Liste documents : key, label_fr, label_ar, ocr_enabled',
  champs_formulaire JSON                         COMMENT 'Liste champs : key, label_fr, label_ar, type, required, section',
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_licence_configs_type (licence_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Config Pharmacie ────────────────────────────────────────
INSERT IGNORE INTO licence_configs (licence_type, label_fr, label_ar, documents_requis, champs_formulaire) VALUES (
  'pharmacie', 'Licence de Pharmacie', 'رخصة الصيدلية',
  JSON_ARRAY(
    JSON_OBJECT('key','cin_proprietaire',   'label_fr','CIN du propriétaire',   'label_ar','بطاقة التعريف للمالك',       'ocr_enabled',TRUE),
    JSON_OBJECT('key','diplome_pharmacie',  'label_fr','Diplôme de pharmacie',  'label_ar','دبلوم الصيدلة',              'ocr_enabled',TRUE),
    JSON_OBJECT('key','permis_exercice',    'label_fr','Permis d\'exercice',    'label_ar','رخصة المزاولة',              'ocr_enabled',TRUE),
    JSON_OBJECT('key','certificat_distance','label_fr','Certificat de distance','label_ar','شهادة المسافة',              'ocr_enabled',FALSE),
    JSON_OBJECT('key','pv_commission',      'label_fr','PV de la commission',   'label_ar','محضر اللجنة',                'ocr_enabled',FALSE)
  ),
  JSON_ARRAY(
    JSON_OBJECT('key','nom_complet',     'label_fr','Nom complet',         'label_ar','الاسم الكامل',       'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','cin',             'label_fr','Numéro CIN',          'label_ar','رقم بطاقة التعريف',  'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','date_naissance',  'label_fr','Date de naissance',   'label_ar','تاريخ الازدياد',     'type','date',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','universite',      'label_fr','Université',          'label_ar','الجامعة',             'type','text',    'required',FALSE,'section','formation'),
    JSON_OBJECT('key','diplome',         'label_fr','Diplôme',             'label_ar','الشهادة',             'type','text',    'required',FALSE,'section','formation'),
    JSON_OBJECT('key','adresse_complete','label_fr','Adresse complète',    'label_ar','العنوان الكامل',      'type','textarea','required',TRUE, 'section','localisation'),
    JSON_OBJECT('key','commune',         'label_fr','Commune',             'label_ar','الجماعة',             'type','text',    'required',TRUE, 'section','localisation'),
    JSON_OBJECT('key','cercle',          'label_fr','Cercle',              'label_ar','الدائرة',             'type','text',    'required',TRUE, 'section','localisation'),
    JSON_OBJECT('key','nom_pharmacie',   'label_fr','Nom de la pharmacie', 'label_ar','اسم الصيدلية',        'type','text',    'required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','date_izin',       'label_fr','Date izin',           'label_ar','تاريخ الإذن',         'type','date',    'required',FALSE,'section','autorisation'),
    JSON_OBJECT('key','numero_izin',     'label_fr','Numéro izin',         'label_ar','رقم الإذن',           'type','text',    'required',FALSE,'section','autorisation')
  )
);

-- ── Config Café / Restaurant ────────────────────────────────
INSERT IGNORE INTO licence_configs (licence_type, label_fr, label_ar, documents_requis, champs_formulaire) VALUES (
  'cafe_restaurant', 'Licence Café / Restaurant', 'رخصة المقهى / المطعم',
  JSON_ARRAY(
    JSON_OBJECT('key','cin_proprietaire',              'label_fr','CIN du propriétaire',               'label_ar','بطاقة التعريف للمالك',           'ocr_enabled',TRUE),
    JSON_OBJECT('key','certificat_propriete_bail',     'label_fr','Certificat de propriété ou bail',   'label_ar','شهادة الملكية أو عقد الكراء',     'ocr_enabled',TRUE),
    JSON_OBJECT('key','certificat_medical',            'label_fr','Certificat médical',                'label_ar','الشهادة الطبية',                   'ocr_enabled',FALSE),
    JSON_OBJECT('key','casier_judiciaire',             'label_fr','Extrait de casier judiciaire',      'label_ar','مستخرج السجل العدلي',              'ocr_enabled',FALSE),
    JSON_OBJECT('key','plan_locaux',                   'label_fr','Plan des locaux',                   'label_ar','مخطط المحل',                       'ocr_enabled',FALSE),
    JSON_OBJECT('key','attestation_conformite_sanitaire','label_fr','Attestation conformité sanitaire','label_ar','شهادة المطابقة الصحية',            'ocr_enabled',FALSE)
  ),
  JSON_ARRAY(
    JSON_OBJECT('key','nom',                  'label_fr','Nom',                        'label_ar','الاسم العائلي',             'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','prenom',               'label_fr','Prénom',                     'label_ar','الاسم الشخصي',              'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','cin',                  'label_fr','Numéro CIN',                 'label_ar','رقم بطاقة التعريف',         'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','date_naissance',       'label_fr','Date de naissance',          'label_ar','تاريخ الازدياد',            'type','date',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','adresse_proprietaire', 'label_fr','Adresse du propriétaire',    'label_ar','عنوان المالك',              'type','textarea','required',TRUE, 'section','identite'),
    JSON_OBJECT('key','adresse_local',        'label_fr','Adresse du local',           'label_ar','عنوان المحل',               'type','textarea','required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','superficie',           'label_fr','Superficie (m²)',            'label_ar','المساحة (م²)',              'type','number',  'required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','capacite_places',      'label_fr','Capacité (nombre de places)','label_ar','الطاقة الاستيعابية (مقاعد)','type','number',  'required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','type_etablissement',   'label_fr','Type d\'établissement',      'label_ar','نوع المؤسسة',               'type','select',  'required',TRUE, 'section','etablissement',
                'options',JSON_ARRAY('café','restaurant','café-restaurant')),
    JSON_OBJECT('key','telephone',            'label_fr','Téléphone',                  'label_ar','الهاتف',                    'type','tel',     'required',FALSE,'section','contact'),
    JSON_OBJECT('key','email',                'label_fr','Email',                      'label_ar','البريد الإلكتروني',         'type','email',   'required',FALSE,'section','contact')
  )
);

-- ── Config Hôpital / Clinique ───────────────────────────────
INSERT IGNORE INTO licence_configs (licence_type, label_fr, label_ar, documents_requis, champs_formulaire) VALUES (
  'hopital_clinique', 'Licence Hôpital / Clinique', 'رخصة المستشفى / العيادة',
  JSON_ARRAY(
    JSON_OBJECT('key','cin_directeur_medical',          'label_fr','CIN du directeur médical',                'label_ar','بطاقة التعريف للمدير الطبي',    'ocr_enabled',TRUE),
    JSON_OBJECT('key','diplome_medecine',               'label_fr','Diplôme de médecine',                    'label_ar','دبلوم الطب',                      'ocr_enabled',TRUE),
    JSON_OBJECT('key','autorisation_exercice',          'label_fr','Autorisation d\'exercice médical',       'label_ar','رخصة مزاولة الطب',                'ocr_enabled',TRUE),
    JSON_OBJECT('key','bail_locaux',                    'label_fr','Certificat de propriété / bail locaux',  'label_ar','عقد الملكية / كراء المحل',         'ocr_enabled',TRUE),
    JSON_OBJECT('key','plans_architecturaux',           'label_fr','Plans architecturaux approuvés',         'label_ar','المخططات المعمارية المعتمدة',      'ocr_enabled',FALSE),
    JSON_OBJECT('key','attestation_nombre_lits',        'label_fr','Attestation du nombre de lits',         'label_ar','شهادة عدد الأسرة',                 'ocr_enabled',FALSE),
    JSON_OBJECT('key','liste_personnel_medical',        'label_fr','Liste du personnel médical',             'label_ar','قائمة الطاقم الطبي',               'ocr_enabled',FALSE),
    JSON_OBJECT('key','certificat_conformite_equip',    'label_fr','Certificat conformité des équipements', 'label_ar','شهادة مطابقة التجهيزات الطبية',    'ocr_enabled',FALSE)
  ),
  JSON_ARRAY(
    JSON_OBJECT('key','nom_directeur',         'label_fr','Nom du directeur médical',     'label_ar','اسم المدير الطبي',          'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','prenom_directeur',      'label_fr','Prénom du directeur médical',  'label_ar','الاسم الشخصي للمدير الطبي', 'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','cin_directeur',         'label_fr','CIN du directeur',             'label_ar','بطاقة التعريف للمدير',       'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','specialite',            'label_fr','Spécialité médicale',          'label_ar','التخصص الطبي',               'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','numero_autorisation',   'label_fr','N° autorisation d\'exercice',  'label_ar','رقم ترخيص الممارسة',        'type','text',    'required',FALSE,'section','autorisation'),
    JSON_OBJECT('key','nom_clinique',          'label_fr','Nom de la clinique',           'label_ar','اسم العيادة / المستشفى',     'type','text',    'required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','adresse',               'label_fr','Adresse',                     'label_ar','العنوان',                    'type','textarea','required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','superficie',            'label_fr','Superficie (m²)',             'label_ar','المساحة (م²)',               'type','number',  'required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','nombre_lits',           'label_fr','Nombre de lits',              'label_ar','عدد الأسرة',                 'type','number',  'required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','type_clinique',         'label_fr','Type de clinique',            'label_ar','نوع العيادة',                'type','select',  'required',TRUE, 'section','etablissement',
                'options',JSON_ARRAY('générale','spécialisée','centre soins')),
    JSON_OBJECT('key','specialites_proposees', 'label_fr','Spécialités proposées',       'label_ar','التخصصات المقدمة',           'type','array',   'required',FALSE,'section','etablissement'),
    JSON_OBJECT('key','telephone',             'label_fr','Téléphone',                   'label_ar','الهاتف',                     'type','tel',     'required',FALSE,'section','contact'),
    JSON_OBJECT('key','email',                 'label_fr','Email',                       'label_ar','البريد الإلكتروني',           'type','email',   'required',FALSE,'section','contact')
  )
);

-- ── Config École Privée ─────────────────────────────────────
INSERT IGNORE INTO licence_configs (licence_type, label_fr, label_ar, documents_requis, champs_formulaire) VALUES (
  'ecole_privee', 'Licence École Privée', 'رخصة المدرسة الخاصة',
  JSON_ARRAY(
    JSON_OBJECT('key','cin_directeur',             'label_fr','CIN du directeur',                  'label_ar','بطاقة التعريف للمدير',          'ocr_enabled',TRUE),
    JSON_OBJECT('key','diplome_directeur',         'label_fr','Diplôme du directeur',              'label_ar','دبلوم المدير',                   'ocr_enabled',TRUE),
    JSON_OBJECT('key','bail_propriete',            'label_fr','Certificat de propriété / bail',    'label_ar','عقد الملكية / الكراء',           'ocr_enabled',TRUE),
    JSON_OBJECT('key','plans_locaux',              'label_fr','Plans des locaux approuvés',         'label_ar','مخططات المحلات المعتمدة',        'ocr_enabled',FALSE),
    JSON_OBJECT('key','liste_enseignants',         'label_fr','Liste des enseignants avec diplômes','label_ar','قائمة الأساتذة مع الشهادات',     'ocr_enabled',FALSE),
    JSON_OBJECT('key','attestation_conformite_salles','label_fr','Attestation conformité des salles','label_ar','شهادة مطابقة القاعات الدراسية','ocr_enabled',FALSE)
  ),
  JSON_ARRAY(
    JSON_OBJECT('key','nom_directeur',     'label_fr','Nom du directeur',       'label_ar','اسم المدير',                  'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','prenom_directeur',  'label_fr','Prénom du directeur',    'label_ar','الاسم الشخصي للمدير',         'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','cin_directeur',     'label_fr','CIN du directeur',       'label_ar','بطاقة التعريف للمدير',         'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','diplome_directeur', 'label_fr','Diplôme du directeur',   'label_ar','دبلوم المدير',                 'type','text',    'required',TRUE, 'section','formation'),
    JSON_OBJECT('key','experience_annees', 'label_fr','Expérience (années)',    'label_ar','الخبرة (سنوات)',               'type','number',  'required',FALSE,'section','formation'),
    JSON_OBJECT('key','nom_ecole',         'label_fr','Nom de l\'école',        'label_ar','اسم المدرسة',                  'type','text',    'required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','adresse',           'label_fr','Adresse',               'label_ar','العنوان',                      'type','textarea','required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','superficie_totale', 'label_fr','Superficie totale (m²)','label_ar','المساحة الإجمالية (م²)',        'type','number',  'required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','cycle',             'label_fr','Cycle d\'enseignement', 'label_ar','مستوى التعليم',                 'type','select',  'required',TRUE, 'section','etablissement',
                'options',JSON_ARRAY('préscolaire','primaire','collège','lycée','multi-cycles')),
    JSON_OBJECT('key','nombre_classes',    'label_fr','Nombre de classes',     'label_ar','عدد الأقسام',                  'type','number',  'required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','capacite_eleves',   'label_fr','Capacité élèves max',   'label_ar','الطاقة الاستيعابية للتلاميذ',  'type','number',  'required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','telephone',         'label_fr','Téléphone',             'label_ar','الهاتف',                       'type','tel',     'required',FALSE,'section','contact'),
    JSON_OBJECT('key','email',             'label_fr','Email',                 'label_ar','البريد الإلكتروني',             'type','email',   'required',FALSE,'section','contact')
  )
);

-- ── Config Salle de Sport ───────────────────────────────────
INSERT IGNORE INTO licence_configs (licence_type, label_fr, label_ar, documents_requis, champs_formulaire) VALUES (
  'salle_sport', 'Licence Salle de Sport', 'رخصة قاعة الرياضة',
  JSON_ARRAY(
    JSON_OBJECT('key','cin_proprietaire',              'label_fr','CIN du propriétaire',                   'label_ar','بطاقة التعريف للمالك',           'ocr_enabled',TRUE),
    JSON_OBJECT('key','bail_propriete',                'label_fr','Certificat de propriété / bail',        'label_ar','عقد الملكية / الكراء',            'ocr_enabled',TRUE),
    JSON_OBJECT('key','diplome_education_physique',    'label_fr','Diplôme éducation physique / coaching', 'label_ar','دبلوم التربية البدنية / التدريب',  'ocr_enabled',TRUE),
    JSON_OBJECT('key','attestation_conformite_equip',  'label_fr','Attestation conformité équipements',   'label_ar','شهادة مطابقة المعدات الرياضية',    'ocr_enabled',FALSE),
    JSON_OBJECT('key','plan_locaux',                   'label_fr','Plan des locaux',                       'label_ar','مخطط القاعة',                      'ocr_enabled',FALSE),
    JSON_OBJECT('key','certificat_medical_responsable','label_fr','Certificat médical du responsable',     'label_ar','الشهادة الطبية للمسؤول',           'ocr_enabled',FALSE)
  ),
  JSON_ARRAY(
    JSON_OBJECT('key','nom',                    'label_fr','Nom',                      'label_ar','الاسم العائلي',              'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','prenom',                 'label_fr','Prénom',                   'label_ar','الاسم الشخصي',               'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','cin',                    'label_fr','Numéro CIN',               'label_ar','رقم بطاقة التعريف',          'type','text',    'required',TRUE, 'section','identite'),
    JSON_OBJECT('key','qualification_sportive', 'label_fr','Qualification sportive',   'label_ar','المؤهل الرياضي',             'type','text',    'required',TRUE, 'section','formation'),
    JSON_OBJECT('key','nom_salle',              'label_fr','Nom de la salle',          'label_ar','اسم القاعة',                 'type','text',    'required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','adresse',                'label_fr','Adresse',                 'label_ar','العنوان',                    'type','textarea','required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','superficie',             'label_fr','Superficie (m²)',          'label_ar','المساحة (م²)',               'type','number',  'required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','type_activites',         'label_fr','Type d\'activités',        'label_ar','نوع الأنشطة',                'type','select',  'required',TRUE, 'section','etablissement',
                'options',JSON_ARRAY('musculation','arts martiaux','yoga','fitness','multi-activités')),
    JSON_OBJECT('key','capacite_membres',       'label_fr','Capacité membres max',     'label_ar','الطاقة الاستيعابية للأعضاء','type','number',  'required',TRUE, 'section','etablissement'),
    JSON_OBJECT('key','equipements_disponibles','label_fr','Équipements disponibles',  'label_ar','التجهيزات المتوفرة',         'type','textarea','required',FALSE,'section','etablissement'),
    JSON_OBJECT('key','telephone',              'label_fr','Téléphone',                'label_ar','الهاتف',                     'type','tel',     'required',FALSE,'section','contact'),
    JSON_OBJECT('key','email',                  'label_fr','Email',                    'label_ar','البريد الإلكتروني',           'type','email',   'required',FALSE,'section','contact')
  )
);

-- ============================================================
-- MIGRATION : email obligatoire + forgot password
-- ============================================================
-- Pour les bases existantes, exécuter ces commandes :
-- ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL AFTER is_active;
-- ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL AFTER reset_token;
-- ALTER TABLE users ADD INDEX idx_users_reset_token (reset_token);
-- ALTER TABLE users MODIFY email VARCHAR(255) NOT NULL;
-- ALTER TABLE users ADD UNIQUE INDEX idx_users_email_unique (email);

-- ============================================================
-- CONFIRMATION
-- ============================================================
SELECT
  'kh_data créée avec succès'                           AS statut,
  (SELECT COUNT(*) FROM users)                               AS nb_users,
  (SELECT COUNT(*) FROM licence_configs)                     AS nb_licence_configs,
  (SELECT GROUP_CONCAT(licence_type) FROM licence_configs)   AS types_licences;
