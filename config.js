// ============================================================
//  CONFIG.JS — Fichier de configuration
//  ⚙️  Seul fichier à modifier pour chaque bâtiment
// ============================================================

const CONFIG = {

  // 🔑 Clé API Google Sheets
  API_KEY: "AIzaSyAbEpEOOrz6BdnZLe6z5o2zst5eZ5iKXWw",

  // 📄 ID du Google Sheet (entre /d/ et /edit dans l'URL)
  SHEET_ID: "1MoFCFiO-ryL1Zl1YGVzT95cN-sC3Src9Qs9Cenn50Tc",

  // 📋 Noms exacts des onglets dans le Google Sheet
  SHEETS: {
    IDENTITE: "Identite",
    EQUIPEMENTS: "équipements",
    ACTIONS: "Plan d'Action"
  },

  // 🔢 Ligne de données du bâtiment dans l'onglet Identité
  DATA_ROW: 5,

  // 🏢 Nom du bâtiment (affiché si le Sheet ne charge pas)
  BATIMENT_NOM: "Bâtiment ENEOR",

};
