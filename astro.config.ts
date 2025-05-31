import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import { viewTransitions, remarkEndOfMarkdown } from "astro-vtbot/starlight-view-transitions";

import vtbot from "astro-vtbot";
import d2 from "astro-d2";
import inoxToolsPortalGun from "@inox-tools/portal-gun";
import type { Badge } from 'node_modules/@astrojs/starlight/schemas/badge';

import og from "astro-og";


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
    }]],
    remarkPlugins: [remarkEndOfMarkdown]
  },

  trailingSlash: 'always',

  integrations: [starlight({
    title: '@vtbag',
    routeMiddleware: ["./src/middleware/overview-link.ts"],
    plugins: [viewTransitions({ declarativeNames: ":is(h2, h3):not(.no-vtbag-decl *) = vtbag-h-; :is(starlight-toc span):not(.no-vtbag-decl *) = vtbag-toc~" })],
    components: {
      Head: "./src/components/NHead.astro",
      PageTitle: "./src/components/PageTitle.astro",
      Sidebar: "./src/components/Sidebar.astro",
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
			tag: "meta",
			attrs: {
				name: "viewport",
				content: "width=device-width, initial-scale=1.0, minimum-scale=1.0"

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

    social: [
      { icon: 'github', label: "GitHub", href: 'https://github.com/vtbag/website' },
      { icon: 'blueSky', label: "Blussky", href: 'https://bsky.app/profile/vtbag.dev' }
    ],
    editLink: {
      baseUrl: "https://github.com/vtbag/website/edit/main/"
    },


    sidebar: sidebar(),
  }), d2({
    skipGeneration: process.env.GITHUB_ACTIONS === "true"
  }), vtbot({ autoLint: false, loadingIndicator: false }), inoxToolsPortalGun(), og()],

  vite: {
    build: {
      //     assetsInlineLimit: 4096,
      minify: false,
      cssMinify: false,

    },
    server: {
      fs: {
        allow: ['..']
      }, allowedHosts: [".trycloudflare.com"]
    },/*
    plugins: [visualizer({
      brotliSize: true
    })]*/
  },
});


function sidebar() {
  return [{
    label: '@vtbag',
    link: '/vtbag/'
  }, {
    label: 'Basics',
    items: [
      { label: 'Test Your Browser', link: "/basics/test-page/" },
      { label: 'View Transition API', link: "/basics/api/" },
      { label: 'Web Framework Support', link: "/basics/frameworks/", badge: { text: 'New!', variant: 'success' } as Badge },

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
    label: 'Tools',
    items: [
      { label: 'Inspection Chamber', link: "/tools/inspection-chamber/" },
      { label: 'Element Crossing', link: "/tools/element-crossing/" },
      { label: 'Turn Signal', link: "/tools/turn-signal/" },
      { label: 'Cam-Shaft', link: "/tools/cam-shaft/" },
      { label: 'Utensil Drawer', link: "/tools/utensil-drawer/" }
    ],
  },
  { label: 'Fun with View Transitions', link: "/fwvt/welcome/", badge: { text: 'New!', variant: 'success' } as Badge }, {
    label: 'Tips & Tricks',
    items: [
      { label: 'Where to Place the CSS', link: "/tips/css/" },
      { label: "Flickering During Fade Animations?", link: "/tips/over-exposure/" },
      { label: "Avoid Pointer Flickering", link: "/tips/pointer/" },
      { label: "Pseudo-Smooth-Scrolling?", link: "/tips/pseudo-smooth-scrolling/" },
      { label: "Automatic Names", link: "/tips/auto-names/" },
      { label: "Retaining Interactivity", link: "/tips/interactivity/", badge: { text: 'New!', variant: 'success' } as Badge },
    ]
  },
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
      { label: "Swirling Image Gallery", link: "/tips/auto-names/" },
      { label: "Derived Trajectories", link: "/vector-demo/" },
      { label: "Chained View Transitions", link: "/chaining-demo/" },
      { label: "Tower of Hanoi", link: "https://fun-with-view-transitions.pages.dev/episode/7/page.html" }
    ]
  }];
}