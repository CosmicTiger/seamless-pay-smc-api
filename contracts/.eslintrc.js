module.exports = {
    root: true,
    env: {
        es6: true,
        node: true,
    },
    extends: [
        "eslint:recommended",
        "prettier",
        "plugin:import/errors",
        "plugin:import/warnings",
        "plugin:import/typescript",
        "google",
        "plugin:@typescript-eslint/recommended",
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: ["tsconfig.json", "tsconfig.dev.json"],
        sourceType: "module",
    },
    ignorePatterns: [
        "/lib/**/*", // Ignore built files.
        "/generated/**/*", // Ignore generated files.
    ],
    plugins: ["@typescript-eslint", "import"],
    rules: {
        quotes: ["error", "double"],
        "import/no-unresolved": 0,
        indent: [
            "error",
            4,
            {
                SwitchCase: 1,
                ignoredNodes: [
                    "TemplateLiteral *",
                    "ConditionalExpression",
                    "JSXElement *",
                    "JSXElement",
                    "JSXFragment",
                    "JSXOpeningElement",
                    "JSXClosingElement",
                    "JSXAttribute",
                    "JSXSpreadAttribute",
                ],
            },
        ],
        "no-tabs": ["error", { allowIndentationTabs: true }],
        "max-len": ["error", { code: 120 }],
        "object-curly-spacing": ["error", "always"],
        "comma-dangle": [
            "error",
            {
                arrays: "always-multiline",
                objects: "always-multiline",
                imports: "always-multiline",
                exports: "always-multiline",
                functions: "ignore",
            },
        ],
        "operator-linebreak": ["error", "before"],
        "new-cap": "off",
        "require-jsdoc": [
            "error",
            {
                require: {
                    FunctionDeclaration: true,
                    MethodDefinition: true,
                    ClassDeclaration: true,
                    ArrowFunctionExpression: true,
                    FunctionExpression: true,
                },
            },
        ],
    },
};
