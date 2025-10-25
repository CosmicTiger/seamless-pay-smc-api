export interface ScalarConfig {
    title: string;
    favicon: string;
    openApiUrl: string;
    theme:
        | "alternate"
        | "default"
        | "moon"
        | "purple"
        | "solarized"
        | "bluePlanet"
        | "saturn"
        | "kepler"
        | "mars"
        | "deepSpace"
        | "laserwave"
        | "none";
    layout: "modern" | "classic";
    content: object;
    customCss: string;
    darkMode?: boolean;
    forceDarkModeState?: "dark" | "light";
    hideDarkModeToggle?: boolean;
    showOperationId?: boolean;
    hideModels?: boolean;
    hideSearch?: boolean;
    hideTestRequestButton?: boolean;
    defaultHttpClient: {
        targetKey: string;
        clientKey: string;
    };
    defaultOpenAllTags?: boolean;
    expandAllModelSections?: boolean;
    expandAllResponses?: boolean;
}

const scalarConfig: ScalarConfig = {
    title: "Seamless Pay API",
    favicon:
        "https://seamlesspay.com/wp-content/uploads/2021/06/cropped-SP-favicon-32x32.png",
    openApiUrl: "/api-docs/scalar-open-api.json",
    theme: "deepSpace",
    layout: "modern",
    content: {
        "application/json": {
            example: {
                message:
                    "Welcome to the Seamless Pay Scalar API documentation.",
            },
        },
    },
    customCss: "",
    darkMode: true,
    hideDarkModeToggle: false,
    showOperationId: true,
    hideModels: false,
    hideSearch: false,
    hideTestRequestButton: false,
    defaultHttpClient: {
        targetKey: "scalarApi",
        clientKey: "scalarApiClient",
    },
    defaultOpenAllTags: false,
    expandAllModelSections: false,
    expandAllResponses: false,
};

export default scalarConfig;
