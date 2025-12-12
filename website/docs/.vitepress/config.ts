import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "temporal-contract",
  description: "Type-safe contracts for Temporal.io workflows and activities",
  base: "/temporal-contract/",

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/logo.svg",

    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api/" },
      { text: "Examples", link: "/examples/" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Core Concepts", link: "/guide/core-concepts" },
            { text: "Installation", link: "/guide/installation" },
          ],
        },
        {
          text: "Implementation",
          items: [
            { text: "Worker Implementation", link: "/guide/worker-implementation" },
            { text: "Entry Points Architecture", link: "/guide/entry-points" },
            { text: "Activity Handler Types", link: "/guide/activity-handlers" },
          ],
        },
        {
          text: "Advanced",
          items: [{ text: "Result Pattern", link: "/guide/result-pattern" }],
        },
      ],
      "/api/": [
        {
          text: "Packages",
          items: [
            { text: "Overview", link: "/api/" },
            { text: "@temporal-contract/contract", link: "/api/contract" },
            { text: "@temporal-contract/worker", link: "/api/worker" },
            { text: "@temporal-contract/worker-boxed", link: "/api/worker-boxed" },
            { text: "@temporal-contract/client", link: "/api/client" },
          ],
        },
      ],
      "/examples/": [
        {
          text: "Examples",
          items: [
            { text: "Overview", link: "/examples/" },
            { text: "Basic Order Processing", link: "/examples/basic-order-processing" },
            { text: "Boxed Order Processing", link: "/examples/boxed-order-processing" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/btravers/temporal-contract" },
      { icon: "npm", link: "https://www.npmjs.com/package/@temporal-contract/contract" },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: `Copyright © 2024-${new Date().getFullYear()} Benoit TRAVERS`,
    },

    search: {
      provider: "local",
    },

    editLink: {
      pattern: "https://github.com/btravers/temporal-contract/edit/main/website/docs/:path",
      text: "Edit this page on GitHub",
    },
  },

  head: [["link", { rel: "icon", type: "image/svg+xml", href: "/temporal-contract/logo.svg" }]],
});
