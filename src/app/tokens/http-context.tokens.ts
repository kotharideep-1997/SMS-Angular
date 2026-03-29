import { HttpContextToken } from '@angular/common/http';

/** When `true`, {@link ApiRequestService} will not attach `Authorization: Bearer …`. */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
