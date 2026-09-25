# Design

## Source of truth

Status: Active. Date: 2026-09-20. Product surfaces: the static Home, Scripts, Products, Exploits, Reviews, and Contact pages. Evidence reviewed: the six HTML pages, version-download cards, the user-provided product-catalog reference, product-card reference, and footer reference. No existing design brief, shared stylesheet, framework, or component library was present.

## Brand

CheatBlox is a compact, dark gaming-oriented product directory. Its personality is direct, modern, and technical. Trust signals are clear navigation, consistent page state, restrained motion, and recognizable platform icons. Avoid bright multi-color decoration, dense controls, and mismatched navigation variants.

## Product goals

Goals: provide clear page navigation, let visitors select a game category in Products, view the available Roblox executor card, surface Roblox version downloads in Exploits, offer a Russian/English interface, prepare obvious entry points for account actions, and provide a consistent site-wide footer with clearly marked contact placeholders. Exploit version values remain copyable and display a date-derived age. Non-goals: implement authentication or downloads before their files are supplied. Success signals: the navigation is visually identical across pages, current page is clear, language selection updates labels immediately, and controls remain usable on narrow screens.

## Personas and jobs

Primary visitors are gamers looking for versions, scripts, community links, and project information. Their jobs are switching sections quickly, opening community channels, and finding the language/account controls without searching.

## Information architecture

Global navigation: CheatBlox home link; Home, Scripts, Products, Exploits, Reviews, Contact; Russian/English selector; Login; Register. The current navigation entry uses orange text. Products contains an orange-accented category control for All Products, Roblox, and CS2; it currently shows the Isaeva Roblox executor card for $7.99 and a clear CS2 empty state. Exploits contains the Roblox version cards and downloads. The Home screen centers a CheatBlox title and a concise benefit statement. Contact retains cards for Discord and Telegram. Every page ends with a shared CheatBlox footer, navigation, resource links, and placeholder Telegram, FunPay, and email contacts.

## Design principles

Use one reusable header pattern; make active state readable without relying only on position; reserve orange for primary navigation and account actions; keep labels short; do not promise authentication until it exists.

## Visual language

Color: near-black page, charcoal header, muted grey inactive links, `#ff9d5c` orange active/action accents, and an orange scrollbar thumb on a dark track. Typography: system sans serif, semibold navigation. Spacing: 10–16 px control gaps; 20 px rounded header. Shape/elevation: dark bordered capsule with a light shadow. Motion: short color/background transitions plus low-key drifting orange background circles. Icons: simple inline SVG only.

## Components

`site-header`: brand, navigation links, compact language toggle, Login and Register links. Variants: desktop single row; responsive wrapped layout. `nav-link`: default, hover, active. `auth-button`: secondary outline Login and filled orange Register. `language-toggle`: RU/EN segmented control with an orange sliding indicator. `product-card`: a shared 48 px icon area with the supplied white Windows mark, the user-supplied light Finder image for Mac cropped to remove its outer white backdrop, Android, and white Apple treatment for iOS; each has an exact version chip centered in the card, animated copy control, and an orange download control at the right. Android opens a compact format menu inside its card: current XAPK or legacy standard APK. The product category selector and Isaeva Roblox executor card live in Products; the version cards and downloads live in Exploits. The shared footer has four information groups: CheatBlox identity, navigation, resources, and contact placeholders. Components are duplicated in static pages until a shared template/build system exists.

## Accessibility

Target: keyboard-operable native links and select, visible focus rings, labels and `aria-current` on the active page. Maintain high contrast text on dark backgrounds. Use `target="_blank"` only with `rel="noopener noreferrer"` for external community links.

## Responsive behavior

At approximately 1020 px, the header wraps controls beneath the primary links; at 700 px, brand and groups wrap and remain centered. Touch targets remain at least 36 px high. Contact cards stack on small screens. The footer grid becomes two columns and then one column.

## Interaction states

Nav links: hover and focus become orange; current link stays orange. Login/Register are visual entry points only until authentication routes exist. The language toggle animates its orange indicator to the selected segment, immediately changes interface labels, and stores its choice for the next page. Product-category tabs retain their selected orange state, filter the visible card, and show the CS2 empty state when applicable. Exploit version copy controls animate into a confirmation checkmark; Windows and Mac Download controls are active for their local ZIP packages. Android opens a format choice inside its own expanded card between the supplied latest XAPK and a legacy standard APK. Its trigger is hidden while the choices are open; a click outside the menu or Escape closes it. iOS has an active orange Download control for its supplied local IPA package.

## Content voice

Use concise English navigation labels already used by the site. Footer brand copy describes CheatBlox in original language rather than copying reference wording. Account controls are `Login` and `Register`; language options are `EN` and `RU`.

## Implementation constraints

Static HTML/CSS/JavaScript only, no dependencies or build runtime. Reuse orange token `#ff9d5c`; use `site-i18n.js` for the six standalone pages and store language preference locally. `site-orbs.js` supplies deterministic per-page decorative layouts and honors reduced-motion preferences. Verify markup presence, key coverage, and link targets after edits.

## Open questions

- [ ] Owner: site owner — impact: high. Where should Login and Register lead when authentication is implemented?
- [ ] Owner: site owner — impact: medium. Translate future page content as it is added.
- [ ] Owner: site owner — impact: medium. Which additional Roblox and CS2 product cards should appear beneath the Products game filter?
