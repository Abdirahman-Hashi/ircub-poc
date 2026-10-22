/** Minimal typing for the converter's callback API (the package ships no types). */
declare module 'openapi-to-postmanv2' {
  export interface ConvertInput {
    readonly type: 'json' | 'string' | 'file';
    readonly data: unknown;
  }
  export interface ConvertOptions {
    readonly folderStrategy?: 'Paths' | 'Tags';
    readonly requestNameSource?: 'Fallback' | 'URL';
    readonly includeAuthInfoInExample?: boolean;
    readonly optimizeConversion?: boolean;
  }
  export interface ConvertResult {
    readonly result: boolean;
    readonly reason?: string;
    readonly output?: readonly { readonly type: string; readonly data: Record<string, unknown> }[];
  }
  export function convert(
    input: ConvertInput,
    options: ConvertOptions,
    callback: (error: Error | null, result: ConvertResult) => void,
  ): void;
}
