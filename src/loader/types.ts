export type Promisable<T> = Promise<T> | T;
export type ModuleSource = string | SharedArrayBuffer | Uint8Array;
export type ModuleFormat = "builtin" | "commonjs" | "json" | "module" | "wasm";

export type ResolveHook = (
  specifier: string,
  context: {
    conditions: string[];
    parentURL?: string;
  },
  fallback: ResolveHook
) => Promisable<{
  url: string;
  format?: ModuleFormat;
}>;

export type GetFormatHook = (
  url: string,
  context: object,
  fallback: GetFormatHook
) => Promisable<{ format: ModuleFormat }>;

export type TransformHook = (
  source: ModuleSource,
  context: Record<"url" | "format", string>,
  fallback: TransformHook
) => Promisable<{ source: ModuleSource }>;

export type LoadHook = (
  url: string,
  context: { format?: ModuleFormat },
  fallback: LoadHook
) => Promisable<{
  format: ModuleFormat;
  source: ModuleSource;
}>;