/** Local detail for the D10 identifier formats; the public shapes live in @ircub/shared. */
export const IDS = {
  /** Weights applied right-to-left to the TIN body for the mod-11 check (ISBN-10 style). */
  TIN_MAX_WEIGHT: 10,
  /** A body whose check would be 10 cannot be expressed in one digit and is never issued. */
  TIN_UNREPRESENTABLE_CHECK: 10,
  /** Attempts to find an unused random TIN before giving up. */
  TIN_GENERATE_ATTEMPTS: 20,
  DECIMAL_RADIX: 10,
  /** Check digits are computed over the body followed by two zeros (ISO 7064 MOD 97-10). */
  MOD97_SHIFT: 100,
  MOD97_COMPLEMENT: 98,
  MOD97_VALID_REMAINDER: 1,
} as const;
