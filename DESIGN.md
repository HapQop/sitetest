# Design

## Source of truth

Status: Active. Date: 2026-09-20. Product surfaces: the static Home, Products, Exploits, Reviews, and Contact pages. Evidence reviewed: the five HTML pages, version-download cards, the user-provided product-catalog reference, product-card reference, and footer reference. No existing design brief, shared stylesheet, framework, or component library was present.

## Brand

CheatBlox is a compact, dark gaming-oriented product directory. Its personality is direct, modern, and technical. Its orange block-style C mark appears beside the CheatBlox wordmark in headers, the footer, and the account welcome panel. Trust signals are clear navigation, consistent page state, restrained motion, and recognizable platform icons. Avoid bright multi-color decoration, dense controls, and mismatched navigation variants.

## Product goals

Goals: provide clear page navigation, let visitors select a game category in Products, view the available Roblox executor card, surface Roblox version downloads in Exploits, offer a Russian/English interface, prepare obvious entry points for account actions, and provide a consistent site-wide footer with clearly marked contact placeholders. Exploit version values remain copyable and display a date-derived age. Non-goals: implement authentication or downloads before their files are supplied. Success signals: the navigation is visually identical across pages, current page is clear, language selection updates labels immediately, and controls remain usable on narrow screens.

The root URL opens the full Home page at `pages/index.html`. On a visitor's first Home view in a tab session, a centered offer appears five seconds after the page loads with Telegram and Discord choices for a 10% code. It does not display a code or a countdown. Product detail pages accept the test code `OPENING` and immediately show the original price struck through beside the 10% discounted price for the selected plan. The displayed discount follows plan and currency changes; order processing is outside this client-side offer flow.

## Personas and jobs

Primary visitors are gamers looking for versions, products, community links, and project information. Their jobs are switching sections quickly, opening community channels, and finding the language/account controls without searching.

## Information architecture

Global navigation: CheatBlox home link; Home, Products, Exploits, Reviews, Contact; Russian/English selector; Login; Register. The current navigation entry uses orange text. Products contains an orange-accented category control for All Products, Roblox, and CS2; it currently shows the Isaeva Roblox executor card for $7.99 and a clear CS2 empty state. Exploits contains the Roblox version cards and downloads. The Home screen centers a CheatBlox title and a concise benefit statement. Contact retains cards for Discord and Telegram. The Home and document pages have a footer with navigation, empty Terms of Service, Privacy Policy, and Refund Policy pages, and Telegram, FunPay, email, and Discord contacts; other pages retain the compact footer.

## Design principles

Use one reusable header pattern; make active state readable without relying only on position; reserve orange for primary navigation and account actions; keep labels short; do not promise authentication until it exists.

## Visual language

Color: near-black page, charcoal header, muted grey inactive links, `#ff9d5c` orange active/action accents, and an orange scrollbar thumb on a dark track. Typography: system sans serif, semibold navigation. Spacing: 10–16 px control gaps; 20 px rounded header. Shape/elevation: dark bordered capsule with a light shadow. Motion: short color/background transitions plus low-key drifting orange bubbles on Home. Icons: simple inline SVG and a shared SVG brand mark.

## Components

Products includes a dark bordered filter sidebar with an orange sliders icon, a title and subtitle, grouped choices, and count badges. Product type has All, Executors, Externals, Scripts, Tools, and Game Accounts; Internal and Subscriptions are omitted. Status has only Online and Offline, with green and pink indicators. Neither is selected initially, so all products remain visible; clicking a selected status again clears the status filter. Price has Any price, Under $10, $10–$25, $25–$50, and $50+, followed by Minimum/Maximum inputs. A Reset all filters button finishes the panel. All product types and Any price have the orange selected treatment initially. The support card is removed. Product type, Status, and Price are active filters that combine with the game tabs and product search. Type counts reflect seven executors, five externals (Lumen, Matcha, Serotonin, Severe, and Matrix Hub), and three scripts (KiciaHook, Yabujin, and MsPaint). Status reads the same uncached WEAO API and fallback as Exploits: Online maps to Online and Offline maps to Offline; missing or failed API data stays unknown. Scripts are always Online and do not depend on the remote status response. Stock is independent of the WEAO operational status: Isaeva has 9 available weekly keys, and all other plans have 0 available. Serotonin is an external Roblox product with unavailable 30-day ($9.99) and 90-day ($24.99) plans. Severe is an unavailable Roblox external with Lifetime (Basic) ($9.99) and Lifetime (Ultimate) ($19.99) plans. KiciaHook and Yabujin are unavailable Roblox scripts with 7-day ($2.99) and 30-day ($7.99) plans. MsPaint is an unavailable Roblox script with 30-day ($2.99) and Lifetime ($20.00) plans. Matrix Hub is an unavailable Roblox external with a Lifetime ($7.99) plan. Every catalog card places its framed Online or Offline status in the upper-right visual area, keeps `Executor`, `External`, or `Script` as the muted category under the product name, and shows only stock in the compact row below it. Counts honor game/search, the price range, and the other selected facet. Reset clears type, status, price, custom bounds, search, and game selections. Empty combinations show a localized empty-state message; the plain CS2 view keeps its existing message. Price uses the current starting price in USD regardless of the display currency. Presets are under $10, $10 up to $25, $25 up to $50, and $50 or more; adjacent presets do not overlap. Custom Minimum ($) and Maximum ($) bounds are inclusive and support cents; a blank bound is unrestricted. Presets clear custom bounds, and custom input clears preset selection. Inverted bounds show no matches. All sidebar text and dollar ranges remain English regardless of site language, using `lang="en"`, `translate="no"`, and no translation attributes. The existing game tabs and search retain their behavior. Desktop places the 280 px sidebar to the left of the cards. At 960 px and below it sits above the catalog, using three section columns on tablets and compact stacked groups on phones.

`site-header`: brand, navigation links, compact language toggle, Login and Register links. Variants: desktop single row; responsive wrapped layout. `nav-link`: default, hover, active. `auth-button`: secondary outline Login and filled orange Register. `language-toggle`: RU/EN segmented control with an orange sliding indicator. The account page has a warm orange Hello panel beside the dark form on desktop and stacks them on small screens. Registration offers circular Telegram and Discord contact choices beneath the fields. `product-card`: a shared 48 px icon area with the supplied white Windows mark, the user-supplied light Finder image for Mac cropped to remove its outer white backdrop, Android, and white Apple treatment for iOS; each has an exact version chip centered in the card, animated copy control, and an orange download control at the right. Android opens a compact format menu inside its card: current XAPK or legacy standard APK. The product category selector and Isaeva Roblox executor card live in Products; the version cards and downloads live in Exploits. The full footer has four information groups: CheatBlox identity, navigation, documents, and contact links. Components are duplicated in static pages until a shared template/build system exists.

## Accessibility

Target: keyboard-operable native links and select, visible focus rings, labels and `aria-current` on the active page. Maintain high contrast text on dark backgrounds. Use `target="_blank"` only with `rel="noopener noreferrer"` for external community links.

## Responsive behavior

At approximately 1020 px, the header wraps controls beneath the primary links; at 700 px, brand and groups wrap and remain centered. Touch targets remain at least 36 px high. Contact cards stack on small screens. The footer grid becomes two columns and then one column.

## Interaction states

The shared header remains fixed and visible while scrolling in either direction. At the very top it uses its expanded layout; away from the top it smoothly narrows and becomes shorter. Its spacer reserves the expanded height to keep page content stable during this transition.

On a first visit, the site reads the visitor's country from Vercel IP geolocation through the uncached same-origin `/api/locale` endpoint. RU, UA, BY, KZ, AM, AZ, GE, KG, MD, TJ, TM, and UZ default to Russian; other detected countries default to English. Currency defaults to the supported local currency, with USD for unsupported countries. The currency menu includes each of these regional currencies. If country detection is unavailable, browser language and locale region supply defaults. Existing saved preferences and new manual selections independently override automatic language and currency, including while the country request is pending. Automatic defaults do not overwrite saved choices. Only the country code is returned; no location permission is requested.

Nav links: hover and focus become orange; current link stays orange. Registration optionally saves a Discord or Telegram username as a pending contact until a bot verifies ownership. The language toggle animates its orange indicator to the selected segment, immediately changes interface labels, and stores its choice for the next page. Product-category tabs retain their selected orange state, filter the visible card, and show the CS2 empty state when applicable. Cards enter from the left in a quick stagger as they first scroll into view and when a filter reveals them; reduced-motion preferences disable these effects. Exploit version copy controls animate into a confirmation checkmark; Windows and Mac Download controls are active for their local ZIP packages. Android opens a format choice inside its own expanded card between the supplied latest XAPK and a legacy standard APK. Its trigger is hidden while the choices are open; a click outside the menu or Escape closes it. iOS has an active orange Download control for its supplied local IPA package.

## Content voice

Use concise English navigation labels already used by the site. Footer brand copy describes CheatBlox in original language rather than copying reference wording. Account controls are `Login` and `Register`; language options are `EN` and `RU`.

## Implementation constraints

Static HTML/CSS/JavaScript with the local Three.js runtime on Home. Reuse orange token `#ff9d5c`; use `site-i18n.js` for the six standalone pages and store language preference locally. `lava-bubbles.js` renders the WebGL bubbles on Home only; all pages use a plain dark background. Verify markup presence, key coverage, and link targets after edits.

## Open questions

- [ ] Owner: site owner — impact: high. Where should Login and Register lead when authentication is implemented?
- [ ] Owner: site owner — impact: medium. Translate future page content as it is added.
- [ ] Owner: site owner — impact: medium. Which additional Roblox and CS2 product cards should appear beneath the Products game filter?
