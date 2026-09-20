# Activhome Action Stack

**Activhome Action Stack** est une carte Lovelace personnalisée pour **Home Assistant** permettant de regrouper verticalement des actions dans un conteneur unique et cohérent avec l'interface Activhome.

Version actuelle : **v0.1.2**

La carte prend en charge les entités `switch`, `input_boolean` et `script`. Elle est conçue pour les tableaux de bord tactiles, les iPad muraux et les interfaces fixes.

## Fonctionnalités

- regroupement de plusieurs actions dans une seule carte ;
- éditeur visuel Home Assistant ;
- prise en charge des entités `switch`, `input_boolean` et `script` ;
- démarrage et arrêt des scripts ;
- script d'arrêt personnalisé facultatif ;
- service personnalisé pour le bouton Power ;
- icône et nom personnalisables ;
- animation facultative de l'icône lorsque l'entité est active ;
- navigation native Home Assistant vers une sous-vue ;
- ouverture de la fenêtre Plus d'informations ;
- hauteur par ligne ou hauteur totale imposée ;
- tailles de police configurables ;
- thèmes Home Assistant et styles Activhome intégrés ;
- CSS avancé facultatif.

## Installation avec HACS

1. Ouvrir **HACS** dans Home Assistant.
2. Ouvrir la section **Tableaux de bord**.
3. Ajouter le dépôt GitHub comme **dépôt personnalisé** de type **Dashboard**.
4. Installer **Activhome Action Stack**.
5. Recharger le navigateur ou l'application Home Assistant.

La ressource chargée par HACS est :

```text
/hacsfiles/activhome-action-stack/activhome-action-stack.js
```

## Utilisation minimale

```yaml
type: custom:activhome-action-stack
style: activhome
items:
  - entity: switch.exemple
    name: Exemple
```

## Exemple avec un script et une navigation

```yaml
type: custom:activhome-action-stack
style: activhome
default_font_size: 20px
row_height: 50
items:
  - entity: script.ambiance_bonjour
    name: Ambiance Bonjour
    icon: mdi:music
    animate_active: true
    animation_duration: 1
    stop_script: script.arret_ambiance_bonjour
    tap_action:
      action: navigate
      navigation_path: /dashboard-activhome/multimedia
```

## Options principales

| Option | Description |
|---|---|
| `items` | Liste des actions affichées dans la carte |
| `style` | Style du conteneur : `transparent`, `activhome`, `glass`, `dark_glass`, `solid`, `neon_pulse`, `neon_glow`, `primary_breathe` ou `primary_tint` |
| `theme` | Thème Home Assistant appliqué à la carte |
| `default_font_size` | Taille de police commune aux lignes |
| `height_mode` | Gestion de la hauteur par ligne (`row`) ou par hauteur totale (`total`) |
| `row_height` | Hauteur de chaque ligne en pixels |
| `target_total_height` | Hauteur totale cible en pixels |
| `accent_color` | Couleur utilisée par les styles Neon et Primary |
| `card_style` | CSS avancé appliqué au conteneur |

## Options d'une action

| Option | Description |
|---|---|
| `entity` | Entité `switch`, `input_boolean` ou `script` |
| `name` | Nom affiché |
| `icon` | Icône personnalisée |
| `animate_active` | Anime l'icône lorsque l'entité est active |
| `animation_duration` | Durée d'un tour d'animation, de 0,2 à 5 secondes |
| `stop_script` | Script facultatif appelé pour arrêter une entité `script` |
| `power_service` | Service personnalisé utilisé par le bouton Power |
| `navigation_path` | Chemin de navigation historique |
| `tap_action` | Action native Home Assistant, notamment `navigate` |
| `font_size` | Taille de police propre à la ligne |

## Navigation

Depuis la version **v0.1.2**, la navigation utilise l'action native Home Assistant `navigate`. Les sous-vues sont ainsi ajoutées correctement à l'historique et la flèche **Retour** conserve son comportement normal.

## Structure du dépôt

```text
activhome-action-stack/
├── dist/
│   └── activhome-action-stack.js
├── hacs.json
├── README.md
└── LICENSE
```

## Compatibilité

Développé pour Home Assistant et les tableaux de bord Lovelace.

## Auteur

**Iouri Becq / Activhome**

## Contact

- Contact direct : i.becq@activ-home.ch
- Contact projet : info@activ-home.ch

## Licence

MIT License  
© 2025–2026 — Iouri Becq / Activhome
