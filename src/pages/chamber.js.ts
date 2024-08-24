import { readFileSync } from 'node:fs';

const inspectionChamber = readFileSync('node_modules/@vtbag/inspection-chamber/lib/index.js');

export async function GET() {
	return new Response(
		`const level = CSS.supports('view-transition-class', 'test') ? 2 : document.startViewTransition ? 1 : 0;setTimeout(async()=>{const s=document.getElementById("vtbag-spacer");s&&s.insertAdjacentHTML("beforeend",(await (await fetch(location.pathname.replace("/demo/","/demo-explainer/"))).text()));if (level < 2) {
      const h1 = document.querySelector('h1');
      h1.insertAdjacentHTML('afterend', level === 0 ? '<p style="padding:10px;background-color: #966">View transitions are not supported in this browser.</p>' : '<p style="padding:10px;background-color: #996">Cross-document view transitions are not supported in this browser.</p>');
    }},2000);if (level > 0) {${inspectionChamber}};`,
		{
			status: 200,
			headers: {
				'Content-Type': 'text/javascript',
			},
		}
	);
}
