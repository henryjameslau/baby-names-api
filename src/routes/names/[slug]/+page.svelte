<script lang="ts">
	import { goto } from '$app/navigation';
	import { randomChoice } from '$lib/static-api';
	import { Hero, Section, Button, Em, Breadcrumb, Main, Details } from '@onsvisual/svelte-components';
	import { Plot, Line, Dot, Geo, setPlotDefaults } from 'svelteplot';
	import { toWords, format } from '@onsvisual/robo-utils';
	import * as topojson from 'topojson-client';
	import { geoCentroid, geoOrthographic } from 'd3-geo';
	import ukTopo from '$lib/ltla2024.json';

	setPlotDefaults({
		axis: {
			tickFontSize: 14,
			tickPadding: 3,
			fill: '#707071', // tick label + axis title color
			stroke: '#d9d9d9' // tick line color (and axis line)
		},
		axisX: {
			tickFontSize: 14
		},
		axisY: {
			tickFontSize: 14,
			titleFontSize: 14
		}
	});

	export let data: {
		latestYear: number;
		series: {
			name: string;
			slug: string;
			boys: { year: number; count: number | null; rank: number }[];
			girls: { year: number; count: number | null; rank: number }[];
		};
		geoBoys: {
			areas: { areaName: string; geography: string; topNames: string[]; count: number | null }[];
		} | null;
		geoGirls: {
			areas: { areaName: string; geography: string; topNames: string[]; count: number | null }[];
		} | null;
		similarBoys: {
			neighbors: { name: string; slug: string; sse: number; overlapYears: number }[];
		} | null;
		similarGirls: {
			neighbors: { name: string; slug: string; sse: number; overlapYears: number }[];
		} | null;
		allNames?: { name: string; slug: string }[];
	};

	const latestByYear = (items: { year: number; count: number | null; rank: number }[]) =>
		items.reduce<null | { year: number; count: number | null; rank: number }>((acc, item) => {
			if (!acc || item.year > acc.year) return item;
			return acc;
		}, null);

	const geoMatch = (targetName: string, area: { topNames: string[] }) =>
		area.topNames.some((name) => name.toLowerCase() === targetName);

	const toDateSeries = (series: { year: number; count: number | null; rank: number }[]) =>
		series
			.filter((entry) => entry.rank !== null)
			.map((entry) => ({
				...entry,
				year: new Date(entry.year, 0, 1)
			}));

	const buildRankTicks = (series: { rank: number }[]) => {
		if (!series.length) return undefined;
		const ranks = series.map((entry) => entry.rank);
		const minRank = Math.min(...ranks);
		const maxRank = Math.max(...ranks);
		if (minRank === maxRank) return [minRank];

		const desiredTicks = 6;
		const rawStep = (maxRank - minRank) / (desiredTicks - 1);
		const step = Math.max(1, Math.round(rawStep));
		const ticks: number[] = [];
		for (let value = minRank; value <= maxRank; value += step) {
			ticks.push(value);
		}
		if (ticks[ticks.length - 1] !== maxRank) {
			ticks.push(maxRank);
		}
		if (series.some((entry) => entry.rank === 1) && !ticks.includes(1)) {
			ticks.push(1);
		}
		return ticks.sort((a, b) => a - b);
	};

	const formatRankTick = (value: number) => format(value, 'd');

	$: target = data.series.name.toLowerCase();
	$: latestBoy = latestByYear(data.series.boys);
	$: latestGirl = latestByYear(data.series.girls);
	$: boyAreas = data.geoBoys ? data.geoBoys.areas.filter((area) => geoMatch(target, area)) : [];
	$: girlAreas = data.geoGirls ? data.geoGirls.areas.filter((area) => geoMatch(target, area)) : [];
	$: boysSeries = toDateSeries(data.series.boys);
	$: girlsSeries = toDateSeries(data.series.girls);
	$: boysRankTicks = buildRankTicks(boysSeries);
	$: girlsRankTicks = buildRankTicks(girlsSeries);
	$: boysCountByName = boyAreas.reduce((map, area) => {
		const key = area.areaName.toLowerCase();
		const next = (area.count ?? 0) + (map.get(key) ?? 0);
		map.set(key, next);
		return map;
	}, new Map<string, number>());
	$: girlsCountByName = girlAreas.reduce((map, area) => {
		const key = area.areaName.toLowerCase();
		const next = (area.count ?? 0) + (map.get(key) ?? 0);
		map.set(key, next);
		return map;
	}, new Map<string, number>());
	$: boysMapCounts = Array.from(boysCountByName.values());
	$: girlsMapCounts = Array.from(girlsCountByName.values());
	$: boysColorBreaks = (() => {
		if (!boysMapCounts.length) return undefined;
		const min = Math.min(...boysMapCounts);
		const max = Math.max(...boysMapCounts);
		if (min === max) return [min];
		const step = (max - min) / 3;
		return [min, min + step, min + step * 2, max];
	})();
	$: girlsColorBreaks = (() => {
		if (!girlsMapCounts.length) return undefined;
		const min = Math.min(...girlsMapCounts);
		const max = Math.max(...girlsMapCounts);
		if (min === max) return [min];
		const step = (max - min) / 3;
		return [min, min + step, min + step * 2, max];
	})();
	$: ltlaFeature = topojson.feature(ukTopo, ukTopo.objects.ltla);
	$: boysMapFeatures = ltlaFeature.features.map((feature) => {
		const name = feature.properties.areanm;
		return {
			...feature,
			properties: {
				...feature.properties,
				count: boysCountByName.get(name.toLowerCase()) ?? null
			}
		};
	});
	$: girlsMapFeatures = ltlaFeature.features.map((feature) => {
		const name = feature.properties.areanm;
		return {
			...feature,
			properties: {
				...feature.properties,
				count: girlsCountByName.get(name.toLowerCase()) ?? null
			}
		};
	});
	$: ukCentroid = geoCentroid(ltlaFeature);
	const mapNullColor = '#f0f0f0';
	const boysMapColors = ['#fbb4b9', '#f768a1', '#ae017e'];
	const girlsMapColors = ['#fbb4b9', '#f768a1', '#ae017e'];
	$: summarySentences = [
		latestBoy && latestBoy.rank != null && latestBoy.count != null
			? {
					sex: 'boys',
					rank: latestBoy.rank,
					year: latestBoy.year,
					count: latestBoy.count
				}
			: null,
		latestGirl && latestGirl.rank != null && latestGirl.count != null
			? {
					sex: 'girls',
					rank: latestGirl.rank,
					year: latestGirl.year,
					count: latestGirl.count
				}
			: null
	]
		.filter(
			(entry): entry is { sex: 'boys' | 'girls'; rank: number; year: number; count: number } =>
				entry !== null
		)
		.sort((a, b) => a.rank - b.rank);

	const normalizeSlug = (slug: string) => {
		try {
			return encodeURIComponent(decodeURIComponent(slug));
		} catch {
			return encodeURIComponent(slug);
		}
	};

	function pickRandom() {
		const entry = data.allNames ? randomChoice(data.allNames) : null;
		if (entry) {
			goto(`/names/${normalizeSlug(entry.slug)}`);
		}
	}
</script>

<svelte:head>
	<title>{data.series.name}</title>
</svelte:head>

<Main>
	<Breadcrumb links={[{ label: 'Home', href: '/' }]} />

	<Hero title={data.series.name}></Hero>

	<Section>
		<h2>Most recent stats</h2>
		{#each summarySentences as entry}
			<p>
				In {entry.year}, there were <Em>{format(entry.count, ',.0f')}</Em>
				{entry.sex} named {data.series.name} and was the
				<Em>{toWords(entry.rank, 'ordinal')}</Em> most popular name.
			</p>
		{/each}
	</Section>

	<Section>
		{#if boysSeries.length > 1 || girlsSeries.length > 1}
			<h2>Rank over time</h2>
		{/if}
		{#if boysSeries.length > 1}
			<h3>Boys</h3>
			<Plot
				marginRight={8}
				y={{
					grid: true,
					reverse: true,
					ticks: boysRankTicks,
					label: 'Rank',
					tickFormat: formatRankTick
				}}
				x={{ grid: true, tickSize: 0 }}
			>
				<Line
					data={boysSeries}
					x="year"
					y="rank"
					stroke="#206095"
					strokeWidth={3}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<Dot data={boysSeries} x="year" y="rank" r={4} fill="#206095" stroke="#206095" />
			</Plot>
		{/if}
		{#if girlsSeries.length > 1}
			<h3>Girls</h3>
			<div class="plot">
				<Plot
					marginRight={8}
					y={{
						grid: true,
						reverse: true,
						ticks: girlsRankTicks,
						label: 'Rank',
						tickSpacing: 0,
						tickFormat: formatRankTick
					}}
					x={{ grid: true, tickSize: 0 }}
				>
					<Line
						data={girlsSeries}
						x="year"
						y="rank"
						stroke="#206095"
						strokeWidth={3}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<Dot data={girlsSeries} x="year" y="rank" r={4} fill="#206095" stroke="#206095" />
				</Plot>
			</div>
		{/if}
	</Section>

	<Section>
		{#if data.similarBoys?.neighbors?.length || data.similarGirls?.neighbors?.length}<h2>
				Similar names based on rank
			</h2>{/if}
		{#if data.similarBoys?.neighbors?.length}
			<h3>Boys</h3>
			<ul>
				{#each data.similarBoys.neighbors as entry}
					<li><a href={`/names/${entry.slug}`}>{entry.name}</a></li>
				{/each}
			</ul>
		{/if}

		{#if data.similarGirls?.neighbors?.length}
			<h3>Girls</h3>
			<ul>
				{#each data.similarGirls.neighbors as entry}
					<li><a href={`/names/${entry.slug}`}>{entry.name}</a></li>
				{/each}
			</ul>
		{/if}

		<Button type="button" on:click={pickRandom}>Pick another random name</Button>
	</Section>

	<Section>
		{#if boyAreas.length || girlAreas.length}
			<h2>Where this name is popular in {data.latestYear}</h2>
		{/if}

		{#if boyAreas.length}
			<h3>Boys map</h3>
			<Plot
				inset={5}
				height={(w) => w}
				projection={{
					type: ({ width, height }) =>
						geoOrthographic()
							.translate([width * 0.5, height * 0.5])
							.scale(width * 0.5 * 1.15)
							.rotate([-ukCentroid[0], -ukCentroid[1]]),
					domain: ltlaFeature
				}}
				color={{
					scheme: boysMapColors,
					label: 'Count',
					legend: true,
					type: 'quantize',
					n: 3,
					ticks: boysColorBreaks,
					unknown: mapNullColor
				}}
			>
				<Geo
					data={boysMapFeatures}
					stroke="#ffffff"
					strokeWidth={0.5}
					fill={(d) => d.properties.count}
					title={(d) => `${d.properties.areanm}\n${d.properties.count ?? 'n/a'}`}
				/>
			</Plot>
		{/if}

		{#if girlAreas.length}
			<h3>Girls map</h3>
			<Plot
				inset={5}
				height={(w) => w}
				projection={{
					type: ({ width, height }) =>
						geoOrthographic()
							.translate([width * 0.5, height * 0.5])
							.scale(width * 0.5 * 1.15)
							.rotate([-ukCentroid[0], -ukCentroid[1]]),
					domain: ltlaFeature
				}}
				color={{
					scheme: girlsMapColors,
					label: 'Count',
					legend: true,
					type: 'quantize',
					n: 3,
					ticks: girlsColorBreaks,
					unknown: mapNullColor
				}}
			>
				<Geo
					data={girlsMapFeatures}
					stroke="#ffffff"
					strokeWidth={0.5}
					fill={(d) => d.properties.count}
					title={(d) => `${d.properties.areanm}\n${d.properties.count ?? 'n/a'}`}
				/>
			</Plot>
		{/if}

		{#if boyAreas.length}
			<Details title="List of areas where {data.series.name} is a popular boys name">
			<ul>
				{#each boyAreas.sort((a, b) => a.count < b.count) as area}
					<li>{area.areaName} ({area.geography}) {area.count ?? ''}</li>
				{/each}
			</ul>
			</Details>
		{/if}

		{#if girlAreas.length}
			<Details title="List of areas where {data.series.name} is a popular girls">
				<ul>
					{#each girlAreas.sort((a, b) => a.count < b.count) as area}
						<li>{area.areaName} ({area.geography}) {area.count ?? ''}</li>
					{/each}
				</ul>
			</Details>
		{/if}
	</Section>
</Main>
