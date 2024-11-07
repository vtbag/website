import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
//import remarkHeadingID from 'remark-heading-id';
import starlightImageZoom from 'starlight-image-zoom';
import { visualizer } from "rollup-plugin-visualizer";

import vtbot from "astro-vtbot";
import d2 from "astro-d2";
import inoxToolsPortalGun from "@inox-tools/portal-gun";
//import type { Badge } from 'node_modules/@astrojs/starlight/schemas/badge';

// https://astro.build/config
export default defineConfig({
  experimental: { directRenderScript: true },
  site: 'https://vtbag.dev',
  compressHTML: false,
  redirects: {
    '/inspection-chamber/': '/tools/inspection-chamber/'
  },
  prefetch: false,
  markdown: {
    rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, {
      behavior: "wrap"
    }], [rehypeExternalLinks, {
      target: "_blank",
      content: {
        type: "text",
        value: "↗"
      }
    }]]
    //		remarkPlugins: [remarkHeadingID]
  },
  trailingSlash: 'always',
  integrations: [starlight({
    title: '@vtbag',
    components: {
      Head: "./src/components/NHead.astro",
      PageTitle: "./src/components/PageTitle.astro",
      PageFrame: "./src/components/PageFrame.astro",
    },
    plugins: [starlightImageZoom()],
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4
    },
    head: [{
      tag: "meta",
      attrs: {
        property: "og:image",
        content: "https://vtbag.dev/social.png"
      }
    }],
    customCss: ["./src/styles/custom.css"],
    lastUpdated: true,
    pagination: true,
    favicon: "/bag4.png",
    logo: {
      src: "./src/assets/mini-bag.webp"
    },
    social: {
      github: 'https://github.com/vtbag/website',
      blueSky:'https://bsky.app/profile/martr.app'
    },
    editLink: {
      baseUrl: "https://github.com/vtbag/website/edit/main/"
    },


    sidebar: sidebar(),
  }), d2({
    skipGeneration: process.env.GITHUB_ACTIONS === "true"
  }), vtbot({ autoLint: false, loadingIndicator: false }), inoxToolsPortalGun()],
  vite: {
    server: {
      fs: {
        allow: ['..']
      }
    },
    plugins: [visualizer({
      brotliSize: true
    })]
  }
});


function sidebar() {
  return [{
    label: '@vtbag',
    link: '/vtbag/'
  }, {
    label: 'Tools',
    items: [
      { label: 'Inspection Chamber', link: "/tools/inspection-chamber/" },
      { label: 'Element Crossing', link: "/tools/element-crossing/" },
      { label: 'Turn-Signal', link: "/tools/turn-signal/" },
      { label: 'Cam-Shaft', link: "/tools/cam-shaft/" }
    ],
  }, {
    label: 'Basics',
    items: [
      { label: 'View Transition API', link: "/basics/api/" },
      { label: 'View Transition Examples', link: "/basics/examples/" },
      { label: 'Structure of Pseudo-Elements', link: "/basics/pseudos/" },
      { label: 'Mechanics of Default Animations', link: "/basics/default-animations/" },
      { label: 'Styling View Transitions', link: "/basics/styling/" }
    ]
  }, {
    label: 'CSS Tips & Tricks',
    items: [
      { label: 'Where to place the CSS', link: "/tips/css/" },
      { label: "Flickering during morph animations?", link: "tips/over-exposure/" },
      { label: "Avoid Pointer Flickering", link: "tips/pointer/" },
      { label: "Pseudo-smooth-scrolling?", link: "tips/pseudo-smooth-scrolling/" }
    ]
  }];
}