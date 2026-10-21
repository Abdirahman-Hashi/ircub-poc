/** Wire format of one Server-Sent Event emitted by `GET /events`. */
export interface SseEnvelope<TType extends string = string, TData = unknown> {
  readonly type: TType;
  readonly data: TData;
  readonly emittedAt: string;
}
