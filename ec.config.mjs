import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';

export default {
	themes: ['github-dark', 'github-light'],
	tabWidth: 2,
	styleOverrides: {
		borderRadius: "0.5rem",
	},
	plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
}
