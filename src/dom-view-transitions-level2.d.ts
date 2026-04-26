declare global {
	interface Document {
		startViewTransition?(
			param?: StartViewTransitionOptions | ViewTransitionUpdateCallback
		): ViewTransition;
		activeViewTransition?: ViewTransition;
	}
	interface Element {
		startViewTransition?(
			param?: StartViewTransitionOptions | ViewTransitionUpdateCallback
		): ViewTransition;
		activeViewTransition?: ViewTransition;
	}
	interface PageSwapEvent extends Event {
		viewTransition?: ViewTransition;
		activation?: NavigationActivation;
	}
	interface PageRevealEvent extends Event {
		viewTransition?: ViewTransition;
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
		readonly types?: Set<string>;
		readonly transitionRoot?: Element;
		waitUntil(promise: Promise<unknown>): void;
	}
	interface Window {
		navigation?: Navigation;
	}
	interface Navigation {
		activation: NavigationActivation;
	}

	interface CSSStyleDeclaration {
		viewTransitionGroup: string;
		viewTransitionScope: string;
	}
}
export {};
