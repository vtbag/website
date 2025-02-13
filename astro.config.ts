import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
//import remarkHeadingID from 'remark-heading-id';
//import starlightImageZoom from 'starlight-image-zoom';
//import { visualizer } from "rollup-plugin-visualizer";

import vtbot from "astro-vtbot";
import d2 from "astro-d2";
import inoxToolsPortalGun from "@inox-tools/portal-gun";
import type { Badge } from 'node_modules/@astrojs/starlight/schemas/badge';
//import { ion } from "starlight-ion-theme";

// https://astro.build/config
export default defineConfig({
  image: { remotePatterns: [{ protocol: "https" }] },
  devToolbar: { enabled: true },
  site: 'https://vtbag.dev',
  compressHTML: false,
  redirects: {
    '/inspection-chamber/': '/tools/inspection-chamber/'
  },
  prefetch: false,
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
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
      MarkdownContent: "./src/components/MarkdownContent.astro",
      PageTitle: "./src/components/PageTitle.astro",
      Sidebar: "./src/components/Sidebar.astro"
    },
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
    }, {
      tag: "link",
      attrs: {
        rel: "me",
        href: "https://mastodon.social/@martrapp"
      }
    }, {
      tag: "link",
      attrs: {
        rel: "expect",
        href: "#sl-main-content",
        blocking: "render"
      }
    }],

    customCss: ["./src/styles/custom.css", "./src/styles/sidebar.css", "./src/styles/view-transitions.css",
      "./src/styles/vtbag-bar.css"],
    lastUpdated: true,
    pagination: true,
    favicon: "/bag4.png",
    logo: {
      src: "./src/assets/mini-bag.webp"
    },
    social: {
      github: 'https://github.com/vtbag/website',
      blueSky: 'https://bsky.app/profile/vtbag.dev'
    },
    editLink: {
      baseUrl: "https://github.com/vtbag/website/edit/main/"
    },


    sidebar: sidebar(),
  }), d2({
    skipGeneration: process.env.GITHUB_ACTIONS === "true"
  }), vtbot({ autoLint: false, loadingIndicator: false }), inoxToolsPortalGun()],
  vite: {
    build: {
      assetsInlineLimit: 4096,
    },
    server: {
      fs: {
        allow: ['..']
      }
    },/*
    plugins: [visualizer({
      brotliSize: true
    })]*/
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
      { label: 'Turn Signal', link: "/tools/turn-signal/" },
      { label: 'Cam-Shaft', link: "/tools/cam-shaft/" },
      { label: 'Utensil Drawer', link: "/tools/utensil-drawer/" }
    ],
  }, {
    label: 'Basics',
    items: [
      { label: 'Test Your Browser', link: "/basics/test-page/" },
      { label: 'View Transition API', link: "/basics/api/" },
      {
        label: 'View Transition Examples', link: "/basics/examples/",
      },
      { label: 'Names and Pseudo-Elements', link: "/basics/pseudos/" },
      { label: 'Mechanics of Default Animations', link: "/basics/default-animations/" },
      { label: 'Styling View Transitions', link: "/basics/styling/" },
      { label: 'JavaScript API', link: "/basics/javascript/" },

      { label: "Playing Hide & Seek", link: "/basics/hide-and-seek/" }
    ]
  }, {
    label: 'CSS Tips & Tricks',
    items: [
      { label: 'Where to Place the CSS', link: "/tips/css/" },
      { label: "Flickering During Fade Animations?", link: "/tips/over-exposure/" },
      { label: "Avoid Pointer Flickering", link: "/tips/pointer/" },
      { label: "Pseudo-Smooth-Scrolling?", link: "/tips/pseudo-smooth-scrolling/" },
      { label: "Automatic Names", link: "/tips/auto-names/" },
    ]
  },
  { label: 'Fun with View Transitions', link: "/fwvt/welcome/", badge: { text: 'New!', variant: 'success' } as Badge },
  { label: "BagLog", link: "/baglog" }, {
    label: 'All Demos',
    collapsed: true,
    items: [
      { label: 'Inspection Chamber in Action', link: "/inspection-chamber-demo/first-page/" },
      { label: 'State Loss on Navigation', link: "/crossing/plain/1/" },
      { label: "Preserved State", link: "/crossing/vanilla/1/" },
      { label: "Preserved State (exp.)", link: "/crossing/over-the-top/1/" },
      { label: "Turn Signal Directions", link: "/signal-demo/bag/" },
      { label: "Image Viewer Demo", link: "/viewer-demo/" },
      { label: "Fishpond Demo", link: "/link-demo/" },
      { label: "Pseudo-Smooth-Scrolling", link: "/shaft-demo/1/" },
      { label: "Instant scrolling with Cam-Shaft", link: "/shaft-demo2/1/" },
      { label: "Can't confine List Elements", link: "/basics/hide-and-seek/problem/" },
      { label: "Simulated Nested View Transition Groups", link: "/basics/hide-and-seek/solution/" },
      { label: "Swirling Image Gallery", link: "/tips/auto-names/" }
    ]
  }];
}