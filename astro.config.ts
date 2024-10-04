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
import type { Badge } from 'node_modules/@astrojs/starlight/schemas/badge';

// https://astro.build/config
export default defineConfig({
  experimental: { directRenderScript: true },
  site: 'https://vtbag.pages.dev',
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
      Head: "./src/components/Head.astro",
      PageTitle: "./src/components/PageTitle.astro"
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
        content: "https://vtbag.pages.dev/social.png"
      }
    }],
    customCss: ["./src/styles/custom.css"],
    lastUpdated: true,
    pagination: true,
    favicon: "/bag3.png",
    logo: {
      src: "./src/assets/bag.png"
    },
    social: {
      github: 'https://github.com/vtbag/website'
    },
    editLink: {
      baseUrl: "https://github.com/vtbag/website/edit/main/"
    },


    sidebar: sidebar(),
  }), d2({
    skipGeneration: process.env.GITHUB_ACTIONS === "true"
  }), vtbot()],
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
      { label: 'Cam-Shaft', link: "/tools/cam-shaft/", badge: { text: 'new', variant: 'tip' } as Badge },
    ],
  }, {
    label: 'Basics',
    items: [
      { label: 'View Transition API', link: "/basics/api/" },
      { label: 'View Transition Examples', link: "/basics/examples/" },
      { label: 'Structure of Pseudo-Elements', link: "/basics/pseudos/" },
      { label: 'Mechanics of Default Animations', link: "/basics/default-animations/" }
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
