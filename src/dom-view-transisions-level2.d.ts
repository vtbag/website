declare global {
	interface PageSwapEvent extends Event {
		viewTransition: ViewTransition;
		activation: NavigationActivation;
	}

	type UpdateCallback = undefined | (() => void | Promise<void>);
	type StartViewTransitionParameter = { types?: string[] | Set<string>; update?: UpdateCallback; };

	interface Document {
		startViewTransition(param?: StartViewTransitionParameter | UpdateCallback): ViewTransition;
	}
	interface PageRevealEvent extends Event {
		viewTransition: ViewTransition;
	}

	interface WindowEventMap {
		pageswap: PageSwapEvent;
		pagereveal: PageRevealEvent;
	}

	interface NavigationActivation {
		entry: NavigationHistoryEntry;
		from: NavigationHistoryEntry;
		navigationType: NavigationTypeString;
	}
	interface AnimationEffect {
		target: HTMLElement;
		pseudoElement?: string;
		getKeyframes: () => Keyframe[];
	}

	interface ViewTransition {
		types: Set<string>;
	}
	interface Window {
		navigation: Navigation;
	}
	interface Navigation {
		activation: NavigationActivation;
	}
}
export { };
