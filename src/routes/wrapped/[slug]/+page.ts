import { error } from '@sveltejs/kit';
import type { PageLoad, EntryGenerator } from './$types';
import { getNameSeriesBySlug, getNames, getMeta, getSimilarityNeighbors } from '$lib/static-api';

export const entries: EntryGenerator = async () => {
	const { readFileSync } = await import('fs');
	const { resolve } = await import('path');
	const raw = readFileSync(resolve('static/api/names/all.json'), 'utf-8');
	const names: { name: string; slug: string }[] = JSON.parse(raw);
	return names.map((n) => ({ slug: n.slug }));
};

export const load: PageLoad = async ({ params, fetch }) => {
	const slug = params.slug;
	let series = null;
	let allNames = null;

	try {
		series = await getNameSeriesBySlug(slug, fetch);
	} catch {}

	if (!series) {
		allNames = await getNames(undefined, fetch);
		const match = allNames.find(
			(entry) => entry.name.toLowerCase() === decodeURIComponent(slug).toLowerCase()
		);
		if (match) {
			try {
				series = await getNameSeriesBySlug(match.slug, fetch);
			} catch {}
		}
	}

	if (!series) {
		throw error(404, 'Name not found.');
	}

	let meta, latestYear;
	try {
		meta = await getMeta(fetch);
		latestYear = Math.max(...meta.years);
	} catch {
		meta = { years: [] };
		latestYear = undefined;
	}

	let similarBoys = null;
	let similarGirls = null;
	let allNamesResult = null;
	try {
		similarBoys = await getSimilarityNeighbors('boys', series.slug, fetch);
	} catch {}
	try {
		similarGirls = await getSimilarityNeighbors('girls', series.slug, fetch);
	} catch {}
	try {
		allNamesResult = allNames ?? (await getNames(undefined, fetch));
	} catch {}

	return {
		latestYear,
		series,
		similarBoys,
		similarGirls,
		allNames: allNames ?? allNamesResult
	};
};
