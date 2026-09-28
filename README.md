# Carnet

Carnet est une application web mobile de gestion de tâches, conçue pour rester simple, rapide et utilisable hors ligne.

## Fonctionnalités

- Ajouter, modifier et supprimer des tâches
- Marquer les tâches comme terminées
- Afficher la progression quotidienne
- Rechercher une tâche
- Historique des tâches terminées
- Mode clair / sombre
- Fonctionnement hors ligne
- Synchronisation automatique entre les appareils
- Authentification par email et mot de passe
- Installation comme application PWA
- Interface pensée pour une utilisation mobile

## Technologies

- React
- Vite
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting
- vite-plugin-pwa
- Lucide React

## Fonctionnement hors ligne

Carnet utilise le cache local de Firestore pour permettre la lecture et l'écriture des tâches sans connexion Internet.

Lorsque la connexion revient, les modifications sont automatiquement synchronisées avec Firestore.

## Installation

### Prérequis

- Node.js
- npm

### Installation du projet

```bash
git clone https://github.com/Alou-creaty/carnet.git
cd carnet
npm install
```
