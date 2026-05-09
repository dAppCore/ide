import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Register Web Awesome custom elements (<wa-page>, <wa-button>, etc).
// Side-effect import — the loader auto-registers every component on
// first reference, dynamically importing the chunk so the initial bundle
// doesn't carry the full library.
import '@awesome.me/webawesome-pro/dist/webawesome.loader.js';

// Register Lethean-3 custom elements (side-effect imports trigger
// @customElement(...) self-registration before Angular templates render).
import './elements';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
