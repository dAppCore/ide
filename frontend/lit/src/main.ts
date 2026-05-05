// Shell primitives — Lethean-3 application shell template
import './elements/shell/lethean-shell';
import './elements/shell/lethean-titlebar';
import './elements/shell/lethean-sidebar';
import './elements/shell/lethean-nav';
import './elements/shell/lethean-vi-dock';
import './elements/shell/lethean-statusbar';
import './elements/shell/lethean-vi-message';
import './elements/shell/lethean-vi-panel';
import './elements/shell/lethean-vi-overlay';

// Toolbar / table primitives
import './elements/shell/lethean-mac-segmented';
import './elements/shell/lethean-mac-tool-button';
import './elements/shell/lethean-section-header';
import './elements/shell/lethean-brief-card';

// Atoms
import './elements/atoms/lethean-icon';
import './elements/atoms/lethean-raven';
import './elements/atoms/lethean-brand-mark';
import './elements/atoms/lethean-vi';
import './elements/atoms/lethean-pill';
import './elements/atoms/lethean-button';
import './elements/atoms/lethean-card';
import './elements/atoms/lethean-status-dot';

// Forms
import './elements/forms/lethean-input';
import './elements/forms/lethean-toggle';
import './elements/forms/lethean-field';
import './elements/forms/lethean-slider';
import './elements/forms/lethean-select';
import './elements/forms/lethean-radio-group';
import './elements/forms/lethean-number-stepper';
import './elements/forms/lethean-color-picker';

// Feedback
import './elements/feedback/lethean-dialog';
import './elements/feedback/lethean-toast';
import './elements/feedback/lethean-empty-state';

// Shell extensions
import './elements/shell/lethean-site-card';

// Vi flows
import './elements/vi/lethean-action-card';
import './elements/vi/lethean-prov-step';
import './elements/vi/lethean-prov-timeline';
import './elements/vi/lethean-checklist-item';
import './elements/vi/lethean-first-win';
import './elements/vi/lethean-onboarding-chat';
import './elements/vi/lethean-ask-vi';
import './elements/vi/lethean-ask-vi-composer';
import './elements/vi/lethean-ask-vi-answer';

// Marketing primitives
import './elements/marketing/lethean-mkt-hero';
import './elements/marketing/lethean-mkt-section';
import './elements/marketing/lethean-mkt-cta';
import './elements/marketing/lethean-mkt-nav';
import './elements/marketing/lethean-mkt-products-mega';
import './elements/marketing/lethean-mkt-solutions-mega';
import './elements/marketing/lethean-mkt-footer';
import './elements/marketing/lethean-products-grid';

// Commerce primitives
import './elements/commerce/lethean-cart-row';
import './elements/commerce/lethean-cart-summary';
import './elements/commerce/lethean-subscription-card';
import './elements/commerce/lethean-invoice-row';
import './elements/commerce/lethean-payment-method-card';
import './elements/commerce/lethean-email-template';

// More feedback
import './elements/feedback/lethean-error-page';
import './elements/feedback/lethean-uptime-strip';

// Animation engine (Stage / Sprite / Easing — ported from
// design/lethean-3/animations.jsx). Stage transitively imports the
// playback bar; sprites are imported by the demo page.
import './elements/animation/lethean-stage';
import './elements/animation/lethean-sprite';
import './elements/animation/lethean-text-sprite';
import './elements/animation/lethean-image-sprite';
import './elements/animation/lethean-rect-sprite';

// Pages — content that mounts inside the shell
import './elements/pages/lethean-account-page';
import './elements/pages/lethean-today-page';
import './elements/pages/lethean-stub-page';
import './elements/pages/lethean-library-page';
import './elements/pages/lethean-animation-page';
import './elements/pages/lethean-marketing-page';
import './elements/pages/lethean-onboarding-page';
import './elements/pages/lethean-ask-vi-page';

// Legacy monolith — kept for parity, will be removed once tabbed/multi-page demo lands
import './elements/lethean-desktop';
