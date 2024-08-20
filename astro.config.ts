import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
//import remarkHeadingID from 'remark-heading-id';
import starlightImageZoom from 'starlight-image-zoom';
import { visualizer } from "rollup-plugin-visualizer";

import vtbot from "astro-vtbot";

// https://astro.build/config
export default defineConfig({
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
      { label: 'Inspection Chamber', link: "/tools/inspection-chamber/" }
    ],
  }, {
    label: 'Basics',
    items: [
      { label: 'View Transition API', link: "/basics/api/" }, {
        label: 'Examples', link: "/basics/examples/"
      }
    ]
  }, {
    label: 'Tips & Tricks',
    items: [
      { label: 'Where to place the CSS', link: "/tips/css/" },
      { label: "Cursor switch on navigation?", link: "tips/pointer/" }
    ]
  }];
}
