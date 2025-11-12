import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";


export default [
  {files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"]},
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
    files: ["postcss.config.js", "tailwind.config.js"],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["test-*.js"],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    rules: {
      "react/react-in-jsx-scope": "off",
      // Adicione regras personalizadas aqui, se necessário
      // Exemplo: "indent": ["error", 2],
      // "linebreak-style": ["error", "unix"],
      // "quotes": ["error", "single"],
      // "semi": ["error", "never"],
    }
  }
];