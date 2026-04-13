const js = require('@eslint/js')
const tseslint = require('typescript-eslint')
const globals = require('globals')
const prettierPlugin = require('eslint-plugin-prettier')

module.exports = [
  {
    ignores: ['node_modules/**', 'eslint.config.cjs']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: {
      prettier: prettierPlugin
    },
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      'prettier/prettier': [
        1,
        {
          semi: false,
          singleQuote: true,
          arrowParens: 'always',
          bracketSpacing: true,
          trailingComma: 'none',
          printWidth: 150,
          htmlWhitespaceSensitivity: 'ignore',
          tabWidth: 2
        }
      ]
    }
  }
]
