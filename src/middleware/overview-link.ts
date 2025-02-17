import { defineRouteMiddleware, type StarlightRouteData} from '@astrojs/starlight/route-data';

export function usePageTitleInTOC(route: StarlightRouteData) {
	const overviewLink = route.toc?.items[0];
	if (overviewLink) {
		const title = route.entry.data.title;
		overviewLink.text += ": " + (title.length > 23 ? title.slice(0, 20)+"...": title);
	}
}

export const onRequest = defineRouteMiddleware((context) => {
	usePageTitleInTOC(context.locals.starlightRoute);
});