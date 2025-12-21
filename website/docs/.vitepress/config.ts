import { withMermaid } from "vitepress-plugin-mermaid";

// https://vitepress.dev/reference/site-config
export default withMermaid({
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
          text: "Usage",
          items: [
            { text: "Defining Contracts", link: "/guide/defining-contracts" },
            { text: "Client Usage", link: "/guide/client-usage" },
            { text: "Worker Usage", link: "/guide/worker-usage" },
          ],
        },
        {
          text: "NestJS Integration",
          items: [
            { text: "NestJS Client Usage", link: "/guide/client-nestjs-usage" },
            { text: "NestJS Worker Usage", link: "/guide/worker-nestjs-usage" },
          ],
        },
        {
          text: "Advanced",
          items: [
            { text: "Result Pattern", link: "/guide/result-pattern" },
            { text: "Worker Implementation", link: "/guide/worker-implementation" },
            { text: "Entry Points Architecture", link: "/guide/entry-points" },
            { text: "Activity Handler Types", link: "/guide/activity-handlers" },
          ],
        },
        {
          text: "Comparisons",
          items: [{ text: "AsyncAPI Compatibility", link: "/guide/asyncapi-compatibility" }],
        },
      ],
      "/api/": [
        {
          text: "Core Packages",
          items: [
            { text: "Overview", link: "/api/" },
            { text: "@temporal-contract/contract", link: "/api/contract" },
            { text: "@temporal-contract/client", link: "/api/client" },
            { text: "@temporal-contract/worker", link: "/api/worker" },
            { text: "@temporal-contract/boxed", link: "/api/boxed" },
            { text: "@temporal-contract/testing", link: "/api/testing" },
          ],
        },
        {
          text: "NestJS Integration",
          items: [
            { text: "@temporal-contract/client-nestjs", link: "/api/client-nestjs" },
            { text: "@temporal-contract/worker-nestjs", link: "/api/worker-nestjs" },
          ],
        },
      ],
      "/examples/": [
        {
          text: "Examples",
          items: [
            { text: "Overview", link: "/examples/" },
            { text: "Basic Order Processing", link: "/examples/basic-order-processing" },
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
      copyright: `Copyright © ${new Date().getFullYear()} Benoit TRAVERS`,
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

  mermaid: {
    // Configuration options for mermaid
    // See: https://mermaid.js.org/config/setup/modules/mermaidAPI.html
  },
});
