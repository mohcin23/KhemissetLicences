# KhemissetLicences
### Système de Gestion des Licences d'Ouverture — Province de Khémisset

Application web full-stack de gestion des demandes de licences d'ouverture pour établissements recevant du public (pharmacie, café/restaurant, hôpital/clinique, école privée, salle de sport).

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18, Tailwind CSS, i18next (FR/AR) |
| Backend | Node.js, Express 4, JWT |
| Base de données | MySQL 8 |
| OCR | Mistral AI |
| PDF | Puppeteer |

## Lancer le projet en local

### Prérequis
- Node.js >= 18
- MySQL 8
- Git

### Installation

```bash
# Cloner le repo
git clone https://github.com/mohcin23/KhemissetLicences.git
cd KhemissetLicences

# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Frontend (nouveau terminal)
cd frontend
npm install
npm start
```

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
