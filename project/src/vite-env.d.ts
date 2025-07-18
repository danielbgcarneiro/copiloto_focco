/// <reference types="vite/client" />

import type { SupabaseClient } from '@supabase/supabase-js'

declare global {
  interface Window {
    supabase: SupabaseClient
    testeRLSCompleto: () => Promise<void>
  }
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.webp' {
  const value: string;
  export default value;
}