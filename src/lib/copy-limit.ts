/** Free Figma copies per device before a guest has to sign in. */
export const FREE_COPIES = 3;

/**
 * Looser cap per network address (hashed), so clearing cookies or opening
 * private windows does not give unlimited free copies. Higher than
 * FREE_COPIES because many people can share one address (office, campus).
 */
export const FREE_COPIES_PER_IP = 12;

/** The per-address counter resets after this many days. */
export const IP_WINDOW_DAYS = 30;
