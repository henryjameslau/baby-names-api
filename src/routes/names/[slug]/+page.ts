import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

type LoadEvent = Parameters<PageLoad>[0];

async function tryFetch<T>(fetch: LoadEvent['fetch'], path: string) {
	const res = await fetch(path);
	if (!res.ok) return null;
	return (await res.json()) as T;
}

function normalizeSlug(slug: string) {
	try {
		return encodeURIComponent(decodeURIComponent(slug));
	} catch {
		return encodeURIComponent(slug);
	}
}


export const load: PageLoad = async ({ fetch, params }) => {
	const normalizedSlug = normalizeSlug(params.slug);
	const strippedSlug = normalizedSlug.replace(/%27/gi, '');
	const fileSlugCandidates = Array.from(
		new Set([
			strippedSlug,
			encodeURIComponent(strippedSlug),
			normalizedSlug,
			encodeURIComponent(normalizedSlug)
		])
	);
	const meta = await fetch('/api/meta.json').then((res) => res.json());
	const latestYear = Math.max(...meta.years);

	let series: {
		name: string;
		slug: string;
		boys: { year: number; count: number | null; rank: number }[];
		girls: { year: number; count: number | null; rank: number }[];
	} | null = null;
	let resolvedFileSlug = fileSlugCandidates[0];
	let allNames: { name: string; slug: string }[] | null = null;

	for (const candidate of fileSlugCandidates) {
		const nextSeries = await tryFetch<{
			name: string;
			slug: string;
			boys: { year: number; count: number | null; rank: number }[];
			girls: { year: number; count: number | null; rank: number }[];
		}>(fetch, `/api/name/${candidate}.json`);
		if (nextSeries) {
			series = nextSeries;
			resolvedFileSlug = candidate;
			break;
		}
	}

	if (!series) {
		allNames = await tryFetch<{ name: string; slug: string }[]>(fetch, `/api/names/all.json`);
		const decodedName = decodeURIComponent(normalizedSlug).toLowerCase();
		const match = allNames?.find((entry) => entry.name.toLowerCase() === decodedName);
		if (match) {
			const matchSlug = normalizeSlug(match.slug);
			const matchStripped = matchSlug.replace(/%27/gi, '');
			const matchCandidates = Array.from(
				new Set([
					matchStripped,
					encodeURIComponent(matchStripped),
					matchSlug,
					encodeURIComponent(matchSlug)
				])
			);
			for (const candidate of matchCandidates) {
				const matchSeries = await tryFetch<{
					name: string;
					slug: string;
					boys: { year: number; count: number | null; rank: number }[];
					girls: { year: number; count: number | null; rank: number }[];
				}>(fetch, `/api/name/${candidate}.json`);
				if (matchSeries) {
					series = matchSeries;
					resolvedFileSlug = candidate;
					break;
				}
			}
		}
	}

	if (!series) {
		throw error(404, 'Name not found.');
	}

	const [geoBoys, geoGirls, similarBoys, similarGirls, allNamesResult] = await Promise.all([
		tryFetch(fetch, `/api/geo/${latestYear}/boys.json`),
		tryFetch(fetch, `/api/geo/${latestYear}/girls.json`),
		tryFetch(fetch, `/api/similar/boys/${resolvedFileSlug}.json`),
		tryFetch(fetch, `/api/similar/girls/${resolvedFileSlug}.json`),
		allNames ?? tryFetch(fetch, `/api/names/all.json`)
	]);

	return {
		latestYear,
		series,
		geoBoys,
		geoGirls,
		similarBoys,
		similarGirls,
		allNames: allNames ?? allNamesResult
	};
};
