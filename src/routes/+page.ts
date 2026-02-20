import type { PageLoad } from './$types';
import { getMeta, getNames } from '$lib/static-api';

export const load: PageLoad = async () => {
	const meta = await getMeta();
	const latestYear = Math.max(...meta.years);

	const newEntriesYear = meta.years.includes(2024) ? 2024 : latestYear;
	const lookbackYears = 3;
	const yearsToCheck = meta.years
		.filter((year: number) => year <= newEntriesYear && year >= newEntriesYear - (lookbackYears - 1))
		.sort((a: number, b: number) => b - a);

	const yearsNeeded = new Set<number>([latestYear, ...yearsToCheck, ...yearsToCheck.map((year) => year - 1)]);
	const topResults = await Promise.all(
		Array.from(yearsNeeded)
			.filter((year) => meta.years.includes(year))
			.map(async (year) => ({
				year,
				data: await import('$lib/static-api').then(m => m.getTop(year))
			}))
	);
	const topByYear = new Map<number, any>(topResults.map((entry) => [entry.year, entry.data]));
	const top = topByYear.get(latestYear);
	const [names, boysNames, girlsNames] = await Promise.all([
		getNames(),
		getNames('boys'),
		getNames('girls')
	]);

	const slugMap = new Map<string, string>(
		names.map((entry: { name: string; slug: string }) => [entry.name.toLowerCase(), entry.slug])
	);

	const attachSlug = (items: { name: string; rank: number; count: number | null; year?: number }[]) =>
		items
			.map((item) => ({ ...item, slug: slugMap.get(item.name.toLowerCase()) ?? '' }))
			.filter((item) => item.slug);

	const topGirls = top.girls.filter((entry: { rank: number }) => entry.rank <= 10);
	const topBoys = top.boys.filter((entry: { rank: number }) => entry.rank <= 10);

	const toTop100 = (items: { rank: number }[]) => items.filter((entry) => entry.rank <= 100);
	const buildNewEntries = (sex: 'boys' | 'girls') => {
		const results: { name: string; rank: number; count: number | null; year: number }[] = [];
		const seen = new Set<string>();
		for (const year of yearsToCheck) {
			const current = topByYear.get(year);
			const previous = topByYear.get(year - 1);
			if (!current || !previous) continue;
			const currentTop = toTop100(current[sex]);
			const previousSet = new Set(
				toTop100(previous[sex]).map((entry: { name: string }) => entry.name.toLowerCase())
			);
			for (const entry of currentTop) {
				const key = entry.name.toLowerCase();
				if (previousSet.has(key) || seen.has(key)) continue;
				seen.add(key);
				results.push({ ...entry, year });
				if (results.length >= 10) return results;
			}
		}
		return results;
	};

	const newGirls = buildNewEntries('girls');
	const newBoys = buildNewEntries('boys');

	const boysSet = new Set(boysNames.map((entry: { name: string }) => entry.name.toLowerCase()));
	const girlsSet = new Set(girlsNames.map((entry: { name: string }) => entry.name.toLowerCase()));
	const popularityByName = new Map<string, number>();
	const updatePopularity = (items: { name: string; rank: number }[]) => {
		if (!items.length) return;
		const maxRank = Math.max(...items.map((entry) => entry.rank));
		for (const entry of items) {
			const key = entry.name.toLowerCase();
			const score =
				maxRank <= 1
					? 100
					: Math.round(100 - ((entry.rank - 1) / (maxRank - 1)) * 100);
			const current = popularityByName.get(key) ?? 0;
			if (score > current) popularityByName.set(key, score);
		}
	};
	updatePopularity(top.boys ?? []);
	updatePopularity(top.girls ?? []);

	const nameIndex = names
		.map((entry: { name: string; slug: string }) => {
			const key = entry.name.toLowerCase();
			const inBoys = boysSet.has(key);
			const inGirls = girlsSet.has(key);
			if (!inBoys && !inGirls) return null;
			const sex = inBoys && inGirls ? 'both' : inBoys ? 'boys' : 'girls';
			return {
				name: entry.name,
				slug: entry.slug,
				sex,
				length: entry.name.length,
				popularity: popularityByName.get(key) ?? 0
			};
		})
		.filter(
			(entry): entry is {
				name: string;
				slug: string;
				sex: 'boys' | 'girls' | 'both';
				length: number;
				popularity: number;
			} => entry !== null
		);

	return {
		latestYear,
		names,
		nameIndex,
		topGirls: attachSlug(topGirls),
		topBoys: attachSlug(topBoys),
		newGirls: attachSlug(newGirls),
		newBoys: attachSlug(newBoys)
	};
};
