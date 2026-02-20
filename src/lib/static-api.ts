export type Sex = 'boys' | 'girls';

export type NameEntry = { name: string; slug: string };
export type YearEntry = { year: number; boys: { name: string; count: number | null }[]; girls: { name: string; count: number | null }[] };
export type RankedEntry = { rank: number; name: string; count: number | null };

const cache = new Map<string, Promise<any>>();

async function fetchJson<T>(path: string, fetchFn?: typeof fetch): Promise<T> {
	let url = path;
	const fetcher = fetchFn ?? fetch;
	if (!cache.has(url)) {
		cache.set(
			url,
			fetcher(url).then((res) => {
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

export async function getMeta(fetchFn?: typeof fetch) {
	return fetchJson<{ years: number[]; geoYears: { boys: number[]; girls: number[] } }>(`/api/meta.json`, fetchFn);
}

export async function getYear(year: number, fetchFn?: typeof fetch) {
	return fetchJson<YearEntry>(`/api/year/${year}.json`, fetchFn);
}

export async function getNames(sex?: Sex, fetchFn?: typeof fetch) {
	const suffix = sex ? sex : 'all';
	return fetchJson<NameEntry[]>(`/api/names/${suffix}.json`, fetchFn);
}

export async function getNameSeriesBySlug(slug: string, fetchFn?: typeof fetch) {
	return fetchJson<{ name: string; slug: string; boys: { year: number; count: number | null; rank: number }[]; girls: { year: number; count: number | null; rank: number }[] }>(
		`/api/name/${toFileSlug(slug)}.json`, fetchFn
	);
}

export async function getNameSeries(name: string, fetchFn?: typeof fetch) {
	const allNames = await getNames(undefined, fetchFn);
	const entry = allNames.find((item) => item.name.toLowerCase() === name.toLowerCase());
	if (!entry) return null;
	return getNameSeriesBySlug(entry.slug, fetchFn);
}

export async function getTop(year: number, fetchFn?: typeof fetch) {
	return fetchJson<{ year: number; boys: RankedEntry[]; girls: RankedEntry[] }>(`/api/top/${year}.json`, fetchFn);
}

export async function getNewEntries(year: number, fetchFn?: typeof fetch) {
	return fetchJson<{ year: number; compareYear: number; boys: RankedEntry[]; girls: RankedEntry[] }>(
		`/api/top/new/${year}.json`, fetchFn
	);
}

export async function getGeo(year: number, sex: Sex, fetchFn?: typeof fetch) {
	return fetchJson<{ year: number; sex: Sex; areas: { code: string; areaName: string; geography: string; topNames: string[]; count: number | null }[] }>(
		`/api/geo/${year}/${sex}.json`, fetchFn
	);
}

export async function getSimilaritySeries(sex: Sex, slug: string, fetchFn?: typeof fetch) {
	return fetchJson<{ name: string; sex: Sex; ranks: { year: number; rank: number }[] }>(
		`/api/similar/series/${sex}/${toFileSlug(slug)}.json`, fetchFn
	);
}

export async function getSimilarityNeighbors(sex: Sex, slug: string, fetchFn?: typeof fetch) {
	return fetchJson<{ name: string; slug: string; sex: Sex; minYears: number; neighbors: { name: string; slug: string; sse: number; overlapYears: number }[] }>(
		`/api/similar/${sex}/${toFileSlug(slug)}.json`, fetchFn
	);
}

export function randomChoice<T>(items: T[]) {
	if (!items.length) return null;
	const idx = Math.floor(Math.random() * items.length);
	return items[idx];
}
