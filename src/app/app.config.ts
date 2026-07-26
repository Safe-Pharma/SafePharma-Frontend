import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './Shared/Interceptors/auth-interceptor';
import { portalAuthInterceptor } from './Shared/Interceptors/portal-auth-interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';


export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideRouter(routes),    provideAnimationsAsync()
,  provideHttpClient(withFetch(), withInterceptors([authInterceptor, portalAuthInterceptor])),
  ],
};