# KhemissetLicences

### Système de Gestion des Licences d'Ouverture — Province de Khémisset

Application web de gestion des demandes de licences d'ouverture pour établissements recevant du public, basée sur une **architecture microservices** conteneurisée avec Docker.

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18, Tailwind CSS, i18next (FR/AR) |
| Backend | Node.js, Express 4, JWT (10 microservices) |
| API Gateway | Node.js, Express 4 |
| Base de données | PostgreSQL 16, Redis 7 |
| OCR | Mistral AI |
| PDF | Puppeteer |
| Containerisation | Docker, Docker Compose |

## Architecture microservices

| Service | Port | Rôle |
|---------|------|------|
| api-gateway | 3001 | Routeur / proxy central |
| auth-service | 5001 | Authentification, JWT, email |
| user-service | 5002 | Gestion des utilisateurs |
| demandes-service | 5003 | Gestion des demandes |
| pdf-service | 5004 | Génération de PDF |
| ocr-service | 5005 | Extraction de texte (OCR) |
| ai-service | 5006 | Chat IA / conseil |
| notification-service | 5007 | Notifications |
| audit-service | 5008 | Journalisation / audit |
| workflow-service | 5009 | Gestion du workflow |
| licences-service | 5010 | Référentiel licences |
| frontend | 80 | Interface utilisateur |

## Lancer le projet

### Prérequis
- Docker & Docker Compose

### Installation

```bash
git clone https://github.com/mohcin23/KhemissetLicences.git
cd KhemissetLicences
docker compose up -d
```

L'application est accessible sur `http://localhost`.

## Licences gérées
- Pharmacie
- Café / Restaurant
- Hôpital / Clinique
- École privée
- Salle de sport

## Rôles
- **Admin** : gestion des utilisateurs, tableaux de bord
- **Agent** : traitement des demandes, workflow
- **Citoyen** : dépôt et suivi des demandes
