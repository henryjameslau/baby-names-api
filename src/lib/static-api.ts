export type Sex = 'boys' | 'girls';

export type NameEntry = { name: string; slug: string };
export type YearEntry = { year: number; boys: { name: string; count: number | null }[]; girls: { name: string; count: number | null }[] };
export type RankedEntry = { rank: number; name: string; count: number | null };

const cache = new Map<string, Promise<any>>();

async function fetchJson<T>(path: string): Promise<T> {
	let url = path;
	if (typeof window === 'undefined' && path.startsWith('/')) {
		// For SSR/prerender, fetch requires an absolute URL. Use a dummy base (localhost) for static builds.
		url = new URL(path, 'http://localhost').toString();
	}
	if (!cache.has(url)) {
		cache.set(
			url,
			fetch(url).then((res) => {
				if (!res.ok) throw new Error(`Failed to fetch ${url}`);
				return res.json();
			})
		);
	}
	return cache.get(url) as Promise<T>;
}

function toFileSlug(slug: string) {
	try {
		return encodeURIComponent(encodeURIComponent(decodeURIComponent(slug)));
	} catch {
		return encodeURIComponent(encodeURIComponent(slug));
	}
}

export async function getMeta() {
	return fetchJson<{ years: number[]; geoYears: { boys: number[]; girls: number[] } }>(`/api/meta.json`);
}

export async function getYear(year: number) {
	return fetchJson<YearEntry>(`/api/year/${year}.json`);
}

export async function getNames(sex?: Sex) {
	const suffix = sex ? sex : 'all';
	return fetchJson<NameEntry[]>(`/api/names/${suffix}.json`);
}

export async function getNameSeriesBySlug(slug: string) {
	return fetchJson<{ name: string; slug: string; boys: { year: number; count: number | null; rank: number }[]; girls: { year: number; count: number | null; rank: number }[] }>(
		`/api/name/${toFileSlug(slug)}.json`
	);
}

export async function getNameSeries(name: string) {
	const allNames = await getNames();
	const entry = allNames.find((item) => item.name.toLowerCase() === name.toLowerCase());
	if (!entry) return null;
	return getNameSeriesBySlug(entry.slug);
}

export async function getTop(year: number) {
	return fetchJson<{ year: number; boys: RankedEntry[]; girls: RankedEntry[] }>(`/api/top/${year}.json`);
}

export async function getNewEntries(year: number) {
	return fetchJson<{ year: number; compareYear: number; boys: RankedEntry[]; girls: RankedEntry[] }>(
		`/api/top/new/${year}.json`
	);
}

export async function getGeo(year: number, sex: Sex) {
	return fetchJson<{ year: number; sex: Sex; areas: { code: string; areaName: string; geography: string; topNames: string[]; count: number | null }[] }>(
		`/api/geo/${year}/${sex}.json`
	);
}

export async function getSimilaritySeries(sex: Sex, slug: string) {
	return fetchJson<{ name: string; sex: Sex; ranks: { year: number; rank: number }[] }>(
		`/api/similar/series/${sex}/${toFileSlug(slug)}.json`
	);
}

export async function getSimilarityNeighbors(sex: Sex, slug: string) {
	return fetchJson<{ name: string; slug: string; sex: Sex; minYears: number; neighbors: { name: string; slug: string; sse: number; overlapYears: number }[] }>(
		`/api/similar/${sex}/${toFileSlug(slug)}.json`
	);
}

export function randomChoice<T>(items: T[]) {
	if (!items.length) return null;
	const idx = Math.floor(Math.random() * items.length);
	return items[idx];
}
