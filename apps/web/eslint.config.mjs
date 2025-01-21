import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { readGitignoreFiles } from "eslint-gitignore";
import drizzle from "eslint-plugin-drizzle";
import _import from "eslint-plugin-import";
import jsxA11Y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

// Read .gitignore and create an ignore function
const gitIgnore = readGitignoreFiles();

export default [
	{
		ignores: [...gitIgnore, "!**/.server", "!**/.client", "build"],
	},
	...compat.extends("eslint:recommended"),
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.commonjs,
			},

			ecmaVersion: "latest",
			sourceType: "module",

			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
	},
	{
		rules: {
			"import/no-named-as-default": "off",
			"import/no-named-as-default-member": "off",
			"react/prop-types": "off", // If using TypeScript, prop-types are less necessary
			"import/namespace": "off", // This seems to be causing issues with module resolution
		},
	},
	...fixupConfigRules(
		compat.extends(
			"plugin:react/recommended",
			"plugin:react/jsx-runtime",
			"plugin:react-hooks/recommended",
			"plugin:jsx-a11y/recommended"
		),
	).map((config) => ({
		...config,
		files: ["**/*.{js,jsx,ts,tsx}"],
	})),
	{
		files: ["**/*.{js,jsx,ts,tsx}"],

		plugins: {
			react: fixupPluginRules(react),
			"jsx-a11y": fixupPluginRules(jsxA11Y),
		},

		settings: {
			react: {
				version: "detect",
			},

			formComponents: ["Form"],

			linkComponents: [
				{
					name: "Link",
					linkAttribute: "to",
				},
				{
					name: "NavLink",
					linkAttribute: "to",
				},
			],

			"import/resolver": {
				typescript: {},
			},
		},
	},
	...fixupConfigRules(
		compat.extends(
			"plugin:@typescript-eslint/recommended",
			"plugin:import/recommended",
			"plugin:import/typescript",
			"plugin:drizzle/recommended",
		),
	).map((config) => ({
		...config,
		files: ["**/*.{ts,tsx}"],
	})),
	{
		files: ["**/*.{ts,tsx}"],

		plugins: {
			"@typescript-eslint": fixupPluginRules(typescriptEslint),
			import: fixupPluginRules(_import),
			drizzle: fixupPluginRules(drizzle),
		},

		languageOptions: {
			parser: tsParser,
		},

		settings: {
			"import/internal-regex": "^~/",

			"import/resolver": {
				node: {
					extensions: [".ts", ".tsx"],
				},

				typescript: {
					alwaysTryTypes: true,
				},
			},
		},
	},
	{
		files: ["**/.eslintrc.cjs"],

		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
];
