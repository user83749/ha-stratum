const ALLOWED_TAGS = new Set([
	'a',
	'b',
	'strong',
	'i',
	'em',
	'u',
	's',
	'p',
	'br',
	'ul',
	'ol',
	'li',
	'code',
	'pre',
	'blockquote'
]);

const ALLOWED_ATTRS = new Set(['href', 'target', 'rel']);
const SAFE_URL = /^(https?:|mailto:|\/|#)/i;

function escapeHtml(input: string): string {
	return input
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

export function sanitizeHtml(input: string | null | undefined): string {
	if (!input) return '';
	if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
		return escapeHtml(input);
	}

	const parser = new DOMParser();
	const doc = parser.parseFromString(input, 'text/html');

	const walk = (node: Node): void => {
		const children = Array.from(node.childNodes);
		for (const child of children) {
			if (child.nodeType !== Node.ELEMENT_NODE) {
				continue;
			}

			const el = child as HTMLElement;
			const tag = el.tagName.toLowerCase();
			if (!ALLOWED_TAGS.has(tag)) {
				const text = doc.createTextNode(el.textContent ?? '');
				el.replaceWith(text);
				continue;
			}

			for (const attr of Array.from(el.attributes)) {
				const name = attr.name.toLowerCase();
				if (!ALLOWED_ATTRS.has(name) || name.startsWith('on')) {
					el.removeAttribute(attr.name);
				}
			}

			if (tag === 'a') {
				const href = el.getAttribute('href')?.trim() ?? '';
				if (!SAFE_URL.test(href)) {
					el.removeAttribute('href');
				} else {
					el.setAttribute('rel', 'noreferrer noopener');
					if (!el.getAttribute('target')) {
						el.setAttribute('target', '_blank');
					}
				}
			}

			walk(el);
		}
	};

	walk(doc.body);
	return doc.body.innerHTML;
}
