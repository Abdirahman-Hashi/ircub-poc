/** Search params accepted by the payments route (deep links from the supervisor bell). */
export interface PaymentsSearch {
  readonly status?: string;
  readonly paymentId?: string;
}
