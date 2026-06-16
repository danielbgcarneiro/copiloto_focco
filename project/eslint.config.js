import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";


export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "*.config.js",
      "*.config.cjs",
      "*.config.mjs",
      // Framework AIOS (L1/L2) e dirs não-app — não fazem parte do código do projeto
      ".aios-core/**",
      "squads/**",
      "supabase/**",
      "database/**",
      "sql/**",
      "*.cjs",
      "debug-schema.ts",
    ]
  },
  {files: ["src/**/*.{ts,tsx}"]},
  {languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } }, globals: {
    ...globals.browser,
    Deno: "readonly",
    __REACT_DEVTOOLS_GLOBAL_HOOK__: "readonly",
    setImmediate: "readonly",
    MSApp: "readonly",
    __magic__: "readonly",
    Buffer: "readonly"
  }}},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReactConfig,
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    rules: {
      // React
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/display-name": "off",

      // TypeScript — relaxado para brownfield
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-wrapper-object-types": "off",

      // JS
      "no-unused-vars": "off",

      // Complexidade ciclomática — meta agressiva como WARN: expõe a cauda como
      // backlog de alvos no `npm run lint`, sem quebrar o build (warnings não
      // falham). Toda função > 20 já foi eliminada; teto baixado para 15.
      // Próximo passo: reduzir o tier 16-20 e baixar até 10.
      "complexity": ["warn", 15],
    }
  }
];