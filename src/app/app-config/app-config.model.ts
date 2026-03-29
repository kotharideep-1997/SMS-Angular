/** Shape of {@link ./config.json} */
export interface AppConfig {
  login: {
    /** Username: letters only (no digits, spaces, or symbols). */
    usernamePattern: string;
    /** Password: starts with a letter; then letters and/or digits only; no spaces or symbols. */
    passwordPattern: string;
  };
}
