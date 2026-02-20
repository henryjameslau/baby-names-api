<script lang="ts">
	import { goto } from '$app/navigation';
	import { randomChoice } from '$lib/static-api';
	import {
		Select,
		Hero,
		Section,
		Button,
		Grid,
		GridCell,
		Main,
		Theme,List,Li
	} from '@onsvisual/svelte-components';

	export let data: {
		latestYear: number;
		names: { name: string; slug: string }[];
		nameIndex: {
			name: string;
			slug: string;
			sex: 'boys' | 'girls' | 'both';
			length: number;
			popularity: number;
		}[];
		topGirls: { name: string; slug: string; rank: number; count: number | null }[];
		topBoys: { name: string; slug: string; rank: number; count: number | null }[];
		newGirls: { name: string; slug: string; rank: number; count: number | null; year: number }[];
		newBoys: { name: string; slug: string; rank: number; count: number | null; year: number }[];
	};

	let selectedName: { name: string; slug: string } | null = null;
	$: sortedNames = [...data.names].sort((a, b) => a.name.localeCompare(b.name));
	const normalizeSlug = (slug: string) => {
		try {
			return encodeURIComponent(decodeURIComponent(slug));
		} catch {
			return encodeURIComponent(slug);
		}
	};
	$: if (selectedName?.slug) {
		goto(`/names/${normalizeSlug(selectedName.slug)}`);
	}

	let nameQuery = '';
	let sexFilter: 'any' | 'boys' | 'girls' | 'both' = 'any';
	let lengthMin = 1;
	let lengthMax = 12;
	let popularityMin = 0;
	let popularityMax = 100;
	let maxResults = 12;

	$: maxNameLength = Math.max(1, ...data.nameIndex.map((entry) => entry.length));
	$: if (lengthMax > maxNameLength) lengthMax = maxNameLength;
	$: if (lengthMin < 1) lengthMin = 1;
	$: if (lengthMin > lengthMax) lengthMin = lengthMax;

	$: popularityFloor = Math.min(popularityMin, popularityMax);
	$: popularityCeil = Math.max(popularityMin, popularityMax);
	$: lengthFloor = Math.min(lengthMin, lengthMax);
	$: lengthCeil = Math.max(lengthMin, lengthMax);
	$: nameQueryValue = nameQuery.trim().toLowerCase();
	$: filteredNames = data.nameIndex
		.filter((entry) => {
			const name = entry.name.toLowerCase();
			if (nameQueryValue) {
				return name.startsWith(nameQueryValue) || name.includes(nameQueryValue);
			}
			return true;
		})
		.filter((entry) => (sexFilter === 'any' ? true : entry.sex === sexFilter))
		.filter((entry) => entry.length >= lengthFloor && entry.length <= lengthCeil)
		.filter((entry) => entry.popularity >= popularityFloor && entry.popularity <= popularityCeil)
		.sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name))
		.slice(0, Math.max(1, maxResults));

	function handleSelectChange(event: CustomEvent) {
		const detail = event.detail as
			| { value?: { name: string; slug: string } }
			| { selected?: { name: string; slug: string } }
			| { option?: { name: string; slug: string } }
			| { name?: string; slug?: string }
			| undefined;
		const next =
			detail && 'value' in detail && detail.value
				? detail.value
				: detail && 'selected' in detail && detail.selected
					? detail.selected
					: detail && 'option' in detail && detail.option
						? detail.option
						: detail && 'slug' in detail
							? (detail as { name?: string; slug?: string })
							: null;
		selectedName = (next && next.slug ? { name: next.name ?? '', slug: next.slug } : null) ?? null;
	}

	function pickRandom() {
		const entry = randomChoice(data.names);
		if (entry) {
			goto(`/names/${normalizeSlug(entry.slug)}`);
		}
	}
</script>

<svelte:head>
	<title>Baby Names</title>
</svelte:head>

<Main>
	<Theme theme='blue'>
	<Hero title="ONS Baby Names">
		<p>Latest data up to: {data.latestYear}</p>
	</Hero>
	</Theme>

	<Section marginTop={true}>
		<Select
			id="name-search"
			name="nameSearch"
			label="Search names"
			mode="search"
			placeholder="Start typing a name"
			options={sortedNames}
			labelKey="name"
			bind:value={selectedName}
			clearable={true}
			on:change={handleSelectChange}
		/>
		<div class="ons-u-mt-s">
			<Button type="button" on:click={pickRandom}>Choose a random name</Button>
		</div>
	</Section>

	<Theme theme="paleblue">
		<Grid colWidth="wide">
			<GridCell>
				<Section marginTop={true}>
					<h2>Top 10 girls names</h2>
					<ol>
						{#each data.topGirls as entry}
							<li>
								<a href={`/names/${entry.slug}`}>{entry.name}</a>
								<!-- <span>Rank {entry.rank}{entry.count !== null ? ` · ${entry.count}` : ''}</span> -->
							</li>
						{/each}
					</ol>
				</Section>
			</GridCell>
			<GridCell>
				<Section marginTop={true}>
					<h2>Top 10 boys names</h2>
					<ol>
						{#each data.topBoys as entry}
							<li>
								<a href={`/names/${entry.slug}`}>{entry.name}</a>
								<!-- <span>Rank {entry.rank}{entry.count !== null ? ` · ${entry.count}` : ''}</span> -->
							</li>
						{/each}
					</ol>
				</Section>
			</GridCell>
			<GridCell>
				<Section>
					<h2>Newest entries into the top 100 (girls)</h2>
					<ol>
						{#each data.newGirls as entry}
							<li>
								<a href={`/names/${entry.slug}`}>{entry.name}</a>
								<!-- <span
								>Year {entry.year} · Rank {entry.rank}{entry.count !== null
									? ` · ${entry.count}`
									: ''}</span
							> -->
							</li>
						{/each}
					</ol>
				</Section>
			</GridCell>
			<GridCell>
				<Section>
					<h2>Newest entries to the top100 (boys)</h2>
					<ol>
						{#each data.newBoys as entry}
							<li>
								<a href={`/names/${entry.slug}`}>{entry.name}</a>
								<!-- <span
								>Year {entry.year} · Rank {entry.rank}{entry.count !== null
									? ` · ${entry.count}`
									: ''}</span
							> -->
							</li>
						{/each}
					</ol>
				</Section>
			</GridCell>
		</Grid>
	</Theme>

	<Theme theme="light">
		<Section marginTop={true}>
			<h2>Baby name selector</h2>
			<div class="selector-layout">
				<div class="filters-col">
					<div class="filters">
						<label>
							<span>Name contains or begins with</span>
							<input type="text" placeholder="e.g. Ann or A" bind:value={nameQuery} />
						</label>
						<label>
							<span>Sex</span>
							<select bind:value={sexFilter}>
								<option value="any">Any</option>
								<option value="boys">Boys</option>
								<option value="girls">Girls</option>
								<option value="both">Both</option>
							</select>
						</label>
						<label>
							<span>Name length</span>
							<div class="range-row">
								<input type="number" min="1" max={maxNameLength} bind:value={lengthMin} />
								<span>to</span>
								<input type="number" min="1" max={maxNameLength} bind:value={lengthMax} />
							</div>
						</label>
						<label>
							<span>Popularity (0-100)</span>
							<div class="range-row">
								<input type="number" min="0" max="100" bind:value={popularityMin} />
								<span>to</span>
								<input type="number" min="0" max="100" bind:value={popularityMax} />
							</div>
							<div class="slider-row">
								<input type="range" min="0" max="100" step="1" bind:value={popularityMin} />
								<input type="range" min="0" max="100" step="1" bind:value={popularityMax} />
							</div>
						</label>
						<label>
							<span>Max results</span>
							<input type="number" min="1" max="200" bind:value={maxResults} />
						</label>
					</div>
				</div>
				<div class="results-col">
					<!-- <p class="results-count">Showing {filteredNames.length} suggestions</p> -->
					<List mode="bare">
					{#each filteredNames as entry}
						<Li>
							<a href={`/names/${normalizeSlug(entry.slug)}`}>{entry.name}</a>
							<span class="meta">{entry.sex} · {entry.length} letters · {entry.popularity}</span>
						</Li>
					{/each}
					</List>
				</div>
			</div>
		</Section>
	</Theme>
</Main>

<style>
	.filters {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
		margin-bottom: 1rem;
	}
	.filters label {
		display: grid;
		gap: 0.35rem;
		font-weight: 600;
	}
	.filters input,
	.filters select {
		width: 100%;
		padding: 0.45rem 0.6rem;
		border: 1px solid #c9c9c9;
		border-radius: 6px;
		font: inherit;
	}
	.range-row {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		gap: 0.5rem;
		align-items: center;
	}
	.slider-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		margin-top: 0.4rem;
	}
	.results-count {
		margin-top: 0.5rem;
		color: #5a5a5a;
	}
	.meta {
		font-size: 0.9rem;
		color: #6b6b6b;
	}
.selector-layout {
	display: flex;
	gap: 2.5rem;
	align-items: flex-start;
	align-content: stretch;
}
.filters-col {
	flex: 0 0 270px;
	min-width: 220px;
}
.results-col {
	flex: 1 1 0%;
	min-width: 0;
}
</style>
