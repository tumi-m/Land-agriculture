import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: ["node_modules/**", ".next/**", ".next-dev/**", "out/**", "test-results/**"],
  },
  {
    // Anything rendered on the server and again in the browser must produce
    // the same string in both. Intl output depends on the ICU data each
    // runtime ships, and they disagree for en-ZA — Node wrote 21.4154 ha as
    // "21,4" where Chromium wrote "21.4". That is a hydration mismatch, and
    // React answers one by discarding the whole server-rendered page and
    // drawing it again. src/lib/format.ts has deterministic replacements.
    files: ["src/components/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name=/^toLocale(Date|Time)?String$/]",
          message:
            "Runtime locale formatting differs between server and browser. Use decimal, group, hectares, rand, sastDate or sastDateTime from @/lib/format.",
        },
        {
          selector: "NewExpression[callee.object.name='Intl']",
          message:
            "Intl output differs between server and browser ICU data. Use the formatters in @/lib/format.",
        },
      ],
    },
  },
];

export default eslintConfig;