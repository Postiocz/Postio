declare module "https://esm.sh/@supabase/supabase-js@2.45.4" {
  export const createClient: typeof import("@supabase/supabase-js").createClient;
}

declare module "npm:jose@5.6.3" {
  export function createRemoteJWKSet(url: URL): unknown;
  export function jwtVerify(
    token: string,
    key: unknown
  ): Promise<{
    payload: Record<string, unknown>;
    protectedHeader: { alg?: string; kid?: string };
  }>;
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};
