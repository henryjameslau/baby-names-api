import fs from 'node:fs/promises';
import path from 'node:path';

export type Sex = 'boys' | 'girls';
export type NameCount = { name: string; count: number | null };
export type YearData = { year: number; boys: NameCount[]; girls: NameCount[] };

type YearIndex = YearData & {
	boysByName: Map<string, number>;
	girlsByName: Map<string, number>;
	boysRankByName: Map<string, number>;
	girlsRankByName: Map<string, number>;
};

const DATA_DIR = path.join(process.cwd(), 'static/data');
const yearCache = new Map<number, YearIndex>();
const namesCache = new Map<string, string[]>();
let metaCache: { years: number[] } | null = null;
const similarityIndexCache = new Map<Sex, { name: string; slug: string; yearCount: number; minYear: number; maxYear: number }[]>();
const similaritySeriesCache = new Map<string, { name: string; sex: Sex; ranks: { year: number; rank: number }[] }>();

const BRACKET_TOKEN_RE = /\s*\[[^\]]+\]\s*/g;

function normalizeName(name: string) {
	return name.replace(BRACKET_TOKEN_RE, '').trim().toLowerCase();
}

function slugifyName(name: string) {
	return encodeURIComponent(normalizeName(name));
}

function buildIndex(data: YearData): YearIndex {
	const boysByName = new Map<string, number>();
	const girlsByName = new Map<string, number>();
	const boysRankByName = new Map<string, number>();
	const girlsRankByName = new Map<string, number>();
	for (const entry of data.boys) {
		const normalized = normalizeName(entry.name);
		if (!normalized) continue;
		if (entry.count !== null) {
			boysByName.set(normalizeName(entry.name), entry.count);
		}
		boysRankByName.set(normalizeName(entry.name), boysRankByName.size + 1);
	}
	for (const entry of data.girls) {
		const normalized = normalizeName(entry.name);
		if (!normalized) continue;
		if (entry.count !== null) {
			girlsByName.set(normalizeName(entry.name), entry.count);
		}
		girlsRankByName.set(normalizeName(entry.name), girlsRankByName.size + 1);
	}
	return { ...data, boysByName, girlsByName, boysRankByName, girlsRankByName };
}

export async function loadYearIndex(year: number): Promise<YearIndex | null> {
	if (yearCache.has(year)) {
		return yearCache.get(year) ?? null;
	}
	try {
		const filePath = path.join(DATA_DIR, `year-${year}.json`);
		const contents = await fs.readFile(filePath, 'utf-8');
		const parsed = JSON.parse(contents) as YearData;
		const index = buildIndex(parsed);
		yearCache.set(year, index);
		return index;
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
			return null;
		}
		throw error;
	}
}

async function loadMeta(): Promise<{ years: number[] }> {
	if (metaCache) return metaCache;
	const filePath = path.join(DATA_DIR, 'meta.json');
	const contents = await fs.readFile(filePath, 'utf-8');
	const parsed = JSON.parse(contents) as { years: number[] };
	metaCache = parsed;
	return parsed;
}

export async function loadAvailableYears(): Promise<number[]> {
	const meta = await loadMeta();
	return meta.years;
}

export async function loadSimilarityIndex(sex: Sex) {
	if (similarityIndexCache.has(sex)) {
		return similarityIndexCache.get(sex) ?? [];
	}
	const filePath = path.join(DATA_DIR, 'similarity', `index-${sex}.json`);
	const contents = await fs.readFile(filePath, 'utf-8');
	const parsed = JSON.parse(contents) as {
		name: string;
		slug: string;
		yearCount: number;
		minYear: number;
		maxYear: number;
	}[];
	similarityIndexCache.set(sex, parsed);
	return parsed;
}

export async function loadSimilaritySeries(sex: Sex, name: string) {
	const slug = slugifyName(name);
	const key = `${sex}:${slug}`;
	if (similaritySeriesCache.has(key)) {
		return similaritySeriesCache.get(key) ?? null;
	}
	try {
		const filePath = path.join(DATA_DIR, 'similarity', `similarity-${sex}-${slug}.json`);
		const contents = await fs.readFile(filePath, 'utf-8');
		const parsed = JSON.parse(contents) as { name: string; sex: Sex; ranks: { year: number; rank: number }[] };
		similaritySeriesCache.set(key, parsed);
		return parsed;
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
			return null;
		}
		throw error;
	}
}

export async function loadSimilaritySeriesBySlug(sex: Sex, slug: string) {
	const key = `${sex}:${slug}`;
	if (similaritySeriesCache.has(key)) {
		return similaritySeriesCache.get(key) ?? null;
	}
	try {
		const filePath = path.join(DATA_DIR, 'similarity', `similarity-${sex}-${slug}.json`);
		const contents = await fs.readFile(filePath, 'utf-8');
		const parsed = JSON.parse(contents) as { name: string; sex: Sex; ranks: { year: number; rank: number }[] };
		similaritySeriesCache.set(key, parsed);
		return parsed;
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
			return null;
		}
		throw error;
	}
}

export function buildRankMap(ranks: { year: number; rank: number }[]) {
	const map = new Map<number, number>();
	for (const entry of ranks) {
		map.set(entry.year, entry.rank);
	}
	return map;
}

export function parseSexParam(value: string | null): Sex | null {
	if (!value) return null;
	const normalized = value.trim().toLowerCase();
	if (normalized === 'boy' || normalized === 'boys' || normalized === 'male' || normalized === 'm') {
		return 'boys';
	}
	if (normalized === 'girl' || normalized === 'girls' || normalized === 'female' || normalized === 'f') {
		return 'girls';
	}
	return null;
}

export function getCount(index: YearIndex, sex: Sex, name: string): number | null {
	const normalized = normalizeName(name);
	const map = sex === 'boys' ? index.boysByName : index.girlsByName;
	return map.get(normalized) ?? null;
}

export function getRank(index: YearIndex, sex: Sex, name: string): { rank: number | null; count: number | null } {
	const count = getCount(index, sex, name);
	if (count === null) {
		const rankMap = sex === 'boys' ? index.boysRankByName : index.girlsRankByName;
		return { rank: rankMap.get(normalizeName(name)) ?? null, count: null };
	}
	const list = sex === 'boys' ? index.boys : index.girls;
	let higher = 0;
	for (const entry of list) {
		if (entry.count !== null && entry.count > count) {
			higher += 1;
		}
	}
	return { rank: higher + 1, count };
}

export async function loadGeo(year: number, sex: Sex): Promise<
	| { year: number; sex: Sex; areas: { code: string; areaName: string; geography: string; topNames: string[]; count: number | null }[] }
	| null
> {
	try {
		const filePath = path.join(DATA_DIR, `geo-${year}-${sex}.json`);
		const contents = await fs.readFile(filePath, 'utf-8');
		return JSON.parse(contents);
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
			return null;
		}
		throw error;
	}
}

export async function loadAllNames(sex: Sex | null): Promise<string[]> {
	const key = sex ?? 'all';
	if (namesCache.has(key)) {
		return namesCache.get(key) ?? [];
	}
	const years = await loadAvailableYears();
	const names = new Set<string>();
	for (const year of years) {
		const index = await loadYearIndex(year);
		if (!index) continue;
		if (!sex || sex === 'boys') {
			for (const entry of index.boys) {
				names.add(entry.name);
			}
		}
		if (!sex || sex === 'girls') {
			for (const entry of index.girls) {
				names.add(entry.name);
			}
		}
	}
	const list = Array.from(names).sort((a, b) => a.localeCompare(b));
	namesCache.set(key, list);
	return list;
}
