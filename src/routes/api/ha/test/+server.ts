import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function normalizeBaseUrl(raw: string): string {
	try {
		const url = new URL(raw.trim());
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			throw new Error('Invalid protocol');
		}
		url.pathname = url.pathname.replace(/\/$/, '');
		url.search = '';
		url.hash = '';
		return url.toString().replace(/\/$/, '');
	} catch {
		error(400, 'Invalid Home Assistant URL');
	}
}

export const POST: RequestHandler = async ({ request, fetch }) => {
	let body: { url?: string; token?: string };

	try {
		body = (await request.json()) as { url?: string; token?: string };
	} catch {
		error(400, 'Invalid JSON body');
	}

	const baseUrl = normalizeBaseUrl(body.url ?? '');
	const token = (body.token ?? '').trim();

	if (!token) {
		error(400, 'Access token is required');
	}

	const response = await fetch(`${baseUrl}/api/`, {
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		error(response.status, 'Unable to connect to Home Assistant');
	}

	return json({ ok: true });
};
