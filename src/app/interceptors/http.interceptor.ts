import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Default headers for all HttpClient traffic. Bearer tokens are attached in {@link ApiRequestService}
 * so API calls get a single, explicit auth layer.
 */
export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ setHeaders: { Accept: 'application/json' } }));
};
