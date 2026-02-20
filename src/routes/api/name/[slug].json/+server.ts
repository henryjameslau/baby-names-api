import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

function buildCandidates(slug: string) {
	const decoded = decodeURIComponent(slug).toLowerCase();
	const stripped = decoded.replace(/'/g, '');
	return Array.from(
		new Set([
			decoded,
			stripped,
			encodeURIComponent(decoded),
			encodeURIComponent(stripped)
		])
	);
}

export const GET: RequestHandler = async ({ params }) => {
	const slug = params.slug ?? '';
	const candidates = buildCandidates(slug);

	for (const candidate of candidates) {
		const filePath = path.resolve(process.cwd(), 'static', 'api', 'name', `${candidate}.json`);
		try {
			await access(filePath);
			const body = await readFile(filePath, 'utf8');
			return new Response(body, {
				headers: {
					'Content-Type': 'application/json'
				}
			});
		} catch {
			// try next candidate
		}
	}

	throw error(404, 'Name not found.');
};
