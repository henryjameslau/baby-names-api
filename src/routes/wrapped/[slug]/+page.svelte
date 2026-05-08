<script lang="ts">
	import { onMount } from 'svelte';
	import { format } from '@onsvisual/robo-utils';
	import { toWords } from '@onsvisual/robo-utils';

	export let data: {
		latestYear: number;
		series: {
			name: string;
			slug: string;
			boys: { year: number; count: number | null; rank: number }[];
			girls: { year: number; count: number | null; rank: number }[];
		};
		similarBoys: {
			neighbors: { name: string; slug: string; sse: number; overlapYears: number }[];
		} | null;
		similarGirls: {
			neighbors: { name: string; slug: string; sse: number; overlapYears: number }[];
		} | null;
	};

	// ── helpers ───────────────────────────────────────────────────────────────
	const latestByYear = (items: { year: number; count: number | null; rank: number }[]) =>
		items.reduce<null | { year: number; count: number | null; rank: number }>((acc, item) => {
			if (!acc || item.year > acc.year) return item;
			return acc;
		}, null);

	const bestRank = (items: { year: number; count: number | null; rank: number }[]) =>
		items.reduce<null | { year: number; count: number | null; rank: number }>((acc, item) => {
			if (item.rank == null) return acc;
			if (!acc || item.rank < acc.rank) return item;
			return acc;
		}, null);

	$: latestBoy = latestByYear(data.series.boys);
	$: latestGirl = latestByYear(data.series.girls);
	$: bestBoy = bestRank(data.series.boys);
	$: bestGirl = bestRank(data.series.girls);
	$: name = data.series.name;

	// ── slides ────────────────────────────────────────────────────────────────
	type Slide = {
		accent: string;
		bg: string;
		label: string;
		value: string;
		sub: string;
	};

	$: slides = [
		{
			accent: '#ff6b6b',
			bg: '#1a0a0a',
			label: '✦ your name wrapped ✦',
			value: name,
			sub: `${data.latestYear} edition`
		},
		...(latestBoy && latestBoy.rank != null && latestBoy.count != null
			? [
					{
						accent: '#6bcbff',
						bg: '#0a0f1a',
						label: '♂ boys · latest rank',
						value: `#${format(latestBoy.rank, 'd')}`,
						sub: `${format(latestBoy.count, ',.0f')} babies named ${name} in ${latestBoy.year}`
					}
				]
			: []),
		...(latestGirl && latestGirl.rank != null && latestGirl.count != null
			? [
					{
						accent: '#ff82c8',
						bg: '#1a0a14',
						label: '♀ girls · latest rank',
						value: `#${format(latestGirl.rank, 'd')}`,
						sub: `${format(latestGirl.count, ',.0f')} babies named ${name} in ${latestGirl.year}`
					}
				]
			: []),
		...(bestBoy && bestBoy.rank != null
			? [
					{
						accent: '#ffe66d',
						bg: '#13120a',
						label: '♂ boys · all-time best',
						value: `#${format(bestBoy.rank, 'd')}`,
						sub: `peak rank reached in ${bestBoy.year}`
					}
				]
			: []),
		...(bestGirl && bestGirl.rank != null
			? [
					{
						accent: '#b8ff82',
						bg: '#0d1a0a',
						label: '♀ girls · all-time best',
						value: `#${format(bestGirl.rank, 'd')}`,
						sub: `peak rank reached in ${bestGirl.year}`
					}
				]
			: []),
		...(data.similarBoys?.neighbors?.length
			? [
					{
						accent: '#a78bfa',
						bg: '#0e0a1a',
						label: '♂ similar boy names',
						value: data.similarBoys.neighbors
							.slice(0, 3)
							.map((n) => n.name)
							.join('  ·  '),
						sub: 'names with similar popularity trends'
					}
				]
			: []),
		...(data.similarGirls?.neighbors?.length
			? [
					{
						accent: '#fb923c',
						bg: '#1a0e0a',
						label: '♀ similar girl names',
						value: data.similarGirls.neighbors
							.slice(0, 3)
							.map((n) => n.name)
							.join('  ·  '),
						sub: 'names with similar popularity trends'
					}
				]
			: [])
	] as Slide[];

	// ── slide carousel ────────────────────────────────────────────────────────
	let current = 0;
	let transitioning = false;

	function goTo(index: number) {
		if (transitioning || index === current) return;
		transitioning = true;
		setTimeout(() => {
			current = index;
			transitioning = false;
		}, 300);
	}

	function next() {
		goTo((current + 1) % slides.length);
	}
	function prev() {
		goTo((current - 1 + slides.length) % slides.length);
	}

	// ── floating shapes ───────────────────────────────────────────────────────
	type Shape = {
		id: number;
		x: number;
		y: number;
		size: number;
		shape: 'circle' | 'blob' | 'star' | 'ring';
		color: string;
		duration: number;
		delay: number;
		opacity: number;
	};

	const SHAPE_COLORS = [
		'#ff6b6b',
		'#6bcbff',
		'#ff82c8',
		'#ffe66d',
		'#b8ff82',
		'#a78bfa',
		'#fb923c',
		'#67e8f9'
	];
	const SHAPES: Shape['shape'][] = ['circle', 'blob', 'star', 'ring'];

	function makeShapes(count: number): Shape[] {
		return Array.from({ length: count }, (_, i) => ({
			id: i,
			x: Math.random() * 100,
			y: Math.random() * 100,
			size: 40 + Math.random() * 120,
			shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
			color: SHAPE_COLORS[Math.floor(Math.random() * SHAPE_COLORS.length)],
			duration: 6 + Math.random() * 10,
			delay: -(Math.random() * 12),
			opacity: 0.07 + Math.random() * 0.13
		}));
	}

	let shapes: Shape[] = [];
	onMount(() => {
		shapes = makeShapes(18);
	});

	function blobPath(size: number): string {
		const r = size / 2;
		const d = r * 0.55;
		return `M ${r},0 C ${r + d},0 ${2 * r},${r - d} ${2 * r},${r} C ${2 * r},${r + d} ${r + d},${2 * r} ${r},${2 * r} C ${r - d},${2 * r} 0,${r + d} 0,${r} C 0,${r - d} ${r - d},0 ${r},0 Z`;
	}

	function starPath(size: number): string {
		const cx = size / 2;
		const cy = size / 2;
		const outer = size / 2;
		const inner = size / 4;
		const points = 5;
		let d = '';
		for (let i = 0; i < points * 2; i++) {
			const angle = (i * Math.PI) / points - Math.PI / 2;
			const r = i % 2 === 0 ? outer : inner;
			const x = cx + r * Math.cos(angle);
			const y = cy + r * Math.sin(angle);
			d += (i === 0 ? 'M' : 'L') + ` ${x},${y}`;
		}
		return d + ' Z';
	}
</script>

<svelte:head>
	<title>{name} · Wrapped</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div
	class="wrapped-root"
	style="--accent: {slides[current].accent}; --bg: {slides[current].bg};"
>
	<!-- floating background shapes -->
	<div class="shapes" aria-hidden="true">
		{#each shapes as s (s.id)}
			<div
				class="shape-wrap"
				style="
					left: {s.x}%;
					top: {s.y}%;
					animation-duration: {s.duration}s;
					animation-delay: {s.delay}s;
				"
			>
				{#if s.shape === 'circle'}
					<svg width={s.size} height={s.size} style="opacity:{s.opacity}">
						<circle cx={s.size / 2} cy={s.size / 2} r={s.size / 2} fill={s.color} />
					</svg>
				{:else if s.shape === 'ring'}
					<svg width={s.size} height={s.size} style="opacity:{s.opacity}">
						<circle
							cx={s.size / 2}
							cy={s.size / 2}
							r={s.size / 2 - 6}
							fill="none"
							stroke={s.color}
							stroke-width="10"
						/>
					</svg>
				{:else if s.shape === 'blob'}
					<svg width={s.size} height={s.size} style="opacity:{s.opacity}">
						<path d={blobPath(s.size)} fill={s.color} />
					</svg>
				{:else if s.shape === 'star'}
					<svg width={s.size} height={s.size} style="opacity:{s.opacity}">
						<path d={starPath(s.size)} fill={s.color} />
					</svg>
				{/if}
			</div>
		{/each}
	</div>

	<!-- slide content -->
	<div class="slide {transitioning ? 'fade-out' : 'fade-in'}">
		<p class="label">{slides[current].label}</p>
		<h1 class="value">{slides[current].value}</h1>
		<p class="sub">{slides[current].sub}</p>
	</div>

	<!-- navigation -->
	<div class="nav">
		<button class="nav-btn" on:click={prev} aria-label="Previous">&#10094;</button>
		<div class="dots">
			{#each slides as _, i}
				<button
					class="dot {i === current ? 'active' : ''}"
					on:click={() => goTo(i)}
					aria-label="Go to slide {i + 1}"
				></button>
			{/each}
		</div>
		<button class="nav-btn" on:click={next} aria-label="Next">&#10095;</button>
	</div>

	<!-- back link -->
	<a class="back-link" href="/names/{data.series.slug}">← see full stats</a>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}

	.wrapped-root {
		font-family: 'Fredoka One', 'Pacifico', 'Comic Sans MS', cursive;
		min-height: 100dvh;
		background-color: var(--bg, #111);
		color: #fff;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
		transition:
			background-color 0.6s ease,
			--accent 0.6s ease;
		padding: 2rem;
		box-sizing: border-box;
	}

	/* ── floating shapes ─────────────────────────────────────────────────── */
	.shapes {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 0;
	}

	.shape-wrap {
		position: absolute;
		animation: float linear infinite;
		transform-origin: center;
	}

	@keyframes float {
		0% {
			transform: translateY(0) rotate(0deg) scale(1);
		}
		25% {
			transform: translateY(-30px) rotate(45deg) scale(1.05);
		}
		50% {
			transform: translateY(-15px) rotate(90deg) scale(0.95);
		}
		75% {
			transform: translateY(-40px) rotate(135deg) scale(1.08);
		}
		100% {
			transform: translateY(0) rotate(180deg) scale(1);
		}
	}

	/* ── slide ───────────────────────────────────────────────────────────── */
	.slide {
		position: relative;
		z-index: 1;
		text-align: center;
		max-width: 700px;
		width: 100%;
		padding: 3rem 2rem;
		background: rgba(255, 255, 255, 0.04);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 2.5rem;
		backdrop-filter: blur(12px);
		box-shadow:
			0 0 60px color-mix(in srgb, var(--accent) 25%, transparent),
			0 0 120px color-mix(in srgb, var(--accent) 10%, transparent);
	}

	.fade-in {
		animation: fadeIn 0.4s ease forwards;
	}

	.fade-out {
		animation: fadeOut 0.3s ease forwards;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.94) translateY(12px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	@keyframes fadeOut {
		from {
			opacity: 1;
			transform: scale(1);
		}
		to {
			opacity: 0;
			transform: scale(0.94);
		}
	}

	.label {
		font-size: clamp(0.85rem, 2.5vw, 1.1rem);
		color: var(--accent);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		margin: 0 0 1.2rem;
		opacity: 0.9;
	}

	.value {
		font-size: clamp(3rem, 13vw, 8rem);
		line-height: 1;
		margin: 0 0 1.4rem;
		color: #fff;
		text-shadow:
			0 0 40px var(--accent),
			0 4px 20px rgba(0, 0, 0, 0.5);
		word-break: break-word;
	}

	.sub {
		font-size: clamp(0.95rem, 3vw, 1.35rem);
		color: rgba(255, 255, 255, 0.7);
		margin: 0;
		line-height: 1.5;
	}

	/* ── navigation ──────────────────────────────────────────────────────── */
	.nav {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		gap: 1.2rem;
		margin-top: 2.2rem;
	}

	.nav-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.2);
		color: #fff;
		border-radius: 50%;
		width: 3rem;
		height: 3rem;
		font-size: 1.1rem;
		cursor: pointer;
		transition:
			background 0.2s,
			transform 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: inherit;
	}

	.nav-btn:hover {
		background: var(--accent);
		transform: scale(1.1);
	}

	.dots {
		display: flex;
		gap: 0.5rem;
	}

	.dot {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.3);
		border: none;
		cursor: pointer;
		padding: 0;
		transition:
			background 0.25s,
			transform 0.2s;
	}

	.dot.active {
		background: var(--accent);
		transform: scale(1.4);
	}

	/* ── back link ───────────────────────────────────────────────────────── */
	.back-link {
		position: relative;
		z-index: 2;
		margin-top: 1.8rem;
		color: rgba(255, 255, 255, 0.45);
		text-decoration: none;
		font-size: 0.95rem;
		letter-spacing: 0.05em;
		transition: color 0.2s;
	}

	.back-link:hover {
		color: var(--accent);
	}
</style>
