# Styling — Seed Reference

## Seed Config
subdomain: styling
domain: frontend
tech_stacks: [tailwindcss, css_modules, sass, styled_components, shadcn_ui]
byte_type_default: article

## Topics to Seed

1. Styling Strategy — utility-first vs CSS Modules vs CSS-in-JS vs plain CSS, picking one and why it matters
2. Design Tokens — colors, spacing, typography as variables, never magic numbers
3. Component Variants — managing sizes, states, themes with cva or tailwind-variants
4. Responsive Design — mobile-first breakpoints, container queries vs media queries, fluid typography
5. Dark Mode — CSS custom properties for theming, prefers-color-scheme, avoiding flash on load
6. Typography — type scale, font loading strategy, font-display swap, web font performance
7. Color System — palette design, semantic color naming, accessibility contrast ratios
8. Layout Primitives — Flexbox vs Grid, when each applies, common layout patterns
9. CSS Cascade & Specificity — why specificity wars happen, how utility-first sidesteps them
10. Animations & Transitions — GPU-composited properties only (transform/opacity), prefers-reduced-motion
11. CSS Custom Properties — runtime theming, JavaScript interop, scoping to components
12. Global Styles — resets, base typography, avoiding global leakage into components
13. Scoping — CSS Modules isolation, CSS-in-JS encapsulation, avoiding style bleed
14. Accessibility — focus-visible, color contrast, never rely on color alone to convey meaning
15. Performance — critical CSS, avoiding layout thrash, will-change and when it hurts
16. Bundle Optimization — purging unused CSS, font subsetting, icon strategy
17. Dev Tooling — Stylelint, Prettier for CSS, PostCSS pipeline
18. Testing — visual regression with Chromatic or Percy, snapshot testing limitations
19. Design System Integration — how the styling layer connects to component library and tokens
20. Tailwind-specific — config extension, arbitrary values, @apply pitfalls, when to extract a component
