import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Register Lethean-3 custom elements (side-effect imports trigger
// @customElement(...) self-registration before Angular templates render).
import './elements';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
