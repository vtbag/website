import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
//import remarkHeadingID from 'remark-heading-id';
import starlightImageZoom from 'starlight-image-zoom';
import { visualizer } from "rollup-plugin-visualizer";

// https://astro.build/config
export default defineConfig({
	site: 'https://vtbag.pages.dev',
	markdown: {
		rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, {
			behavior: "wrap"
		}], [rehypeExternalLinks, {
			target: "_blank",
			content: {
				type: "text",
				value: "↗"
			}
		}]],
		//		remarkPlugins: [remarkHeadingID]
	},
	trailingSlash: 'ignore',
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
			github: 'https://github.com/vtbag/website',
		},
		editLink: {
			baseUrl: "https://github.com/vtbag/website/edit/main/"
		},
		sidebar: [
			{
				label: 'Overview',
				link: '/Overview',
			},
		],
	}),
	],

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
