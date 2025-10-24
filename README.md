# 📚 Papermap

Une application web 100% front-end pour organiser vos articles de recherche avec des vues graphe et liste.

## ✨ Fonctionnalités

### Deux vues principales
- **Vue Graphe** : Visualisez vos articles comme un réseau de nœuds interconnectés
- **Vue Liste** : Consultez tous vos articles dans une table structurée

### Gestion des articles
- ✏️ Créer et éditer des articles avec titre, texte et champs personnalisés
- 🏷️ Assigner des catégories/étiquettes multiples
- 🔗 Créer des connexions entre articles (avec labels optionnels)
- 🔍 Filtrer par catégorie
- 🔎 Rechercher dans les articles

### Export et sauvegarde
- 💾 Sauvegarde automatique dans le navigateur (localStorage)
- 📥 Exporter le projet complet en JSON
- 📤 Importer un projet depuis un fichier JSON
- 📄 Exporter en PDF (articles groupés par catégorie)

## 🚀 Installation et déploiement

### Utilisation locale

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/votre-username/papermap.git
   cd papermap
   ```

2. **Ouvrir dans un navigateur**
   - Simplement ouvrir `index.html` dans votre navigateur
   - Ou utiliser un serveur local:
     ```bash
     # Python 3
     python -m http.server 8000
     
     # Node.js (avec http-server)
     npx http-server
     ```
   - Accéder à `http://localhost:8000`

### Déploiement sur GitHub Pages

1. **Pousser le code sur GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/votre-username/papermap.git
   git push -u origin main
   ```

2. **Activer GitHub Pages**
   - Aller dans Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` / `root`
   - Sauvegarder

3. **Accéder à votre site**
   - Votre site sera disponible à: `https://votre-username.github.io/papermap/`

## 📖 Guide d'utilisation

### Créer un projet

1. **Ajouter des articles**
   - Cliquer sur "➕ Nouvel Article"
   - Remplir le titre (obligatoire)
   - Ajouter des catégories (séparées par virgules): `idée, méthodologie, résultats`
   - Ajouter du texte/notes/résumé
   - Optionnel: ajouter des champs personnalisés (auteur, année, DOI, etc.)

2. **Créer des connexions**
   - Cliquer sur "🔗 Ajouter Connexion"
   - Sélectionner l'article source et l'article cible
   - Optionnel: ajouter un label (cite, contredit, complète, etc.)

3. **Organiser avec les catégories**
   - Utiliser les catégories pour grouper vos articles (ex: par thème, par type, par statut)
   - Filtrer la vue par catégorie avec le menu déroulant

### Navigation

- **Vue Graphe** : Double-cliquer sur un nœud pour éditer l'article
- **Vue Liste** : Cliquer sur "✏️ Éditer" pour modifier un article
- Passer d'une vue à l'autre avec les boutons en haut

### Sauvegarder et partager

- **Sauvegarde locale** : Automatique dans le navigateur (localStorage)
- **Export projet** : Télécharger un fichier JSON de tout votre projet
- **Import projet** : Charger un projet depuis un fichier JSON
- **Export PDF** : Générer un PDF avec tous les articles groupés par catégorie

## 🛠️ Technologies utilisées

- **HTML5/CSS3** : Interface utilisateur
- **JavaScript ES6+** : Logique applicative
- **vis-network** : Visualisation du graphe
- **jsPDF** : Génération de PDF
- **localStorage** : Persistance des données

## 📁 Structure du projet

```
papermap/
├── index.html          # Page principale
├── styles.css          # Styles CSS
├── app.js              # Logique JavaScript
├── README.md           # Documentation
└── .github/
    └── copilot-instructions.md
```

## 🌐 Compatibilité

- ✅ Chrome/Edge (recommandé)
- ✅ Firefox
- ✅ Safari
- ✅ Fonctionne hors ligne après le premier chargement

## 💡 Conseils d'utilisation

1. **Organisez avec les catégories** : Utilisez des catégories cohérentes pour faciliter le filtrage
2. **Utilisez les champs personnalisés** : Ajoutez "Auteur", "Année", "DOI", "Journal" selon vos besoins
3. **Sauvegardez régulièrement** : Exportez votre projet en JSON comme backup
4. **Connexions significatives** : Utilisez les labels pour qualifier la nature des relations

## 🔒 Données et confidentialité

- **Aucune donnée envoyée à un serveur** : Tout reste dans votre navigateur
- **Pas de tracking** : Aucune analytique ou suivi
- **Vos données vous appartiennent** : Exportez-les quand vous voulez

## 📝 License

MIT License - Libre d'utilisation et de modification

## 🤝 Contribution

Les contributions sont bienvenues ! N'hésitez pas à ouvrir des issues ou des pull requests.

---

**Fait avec ❤️ pour la recherche et l'organisation des connaissances**
