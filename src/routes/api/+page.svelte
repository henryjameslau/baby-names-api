<svelte:head>
	<title>Baby Names API</title>
</svelte:head>

<main>
	<h1>Baby Names API</h1>
	<p>Build the JSON data files for the static API under <code>/api</code>.</p>

	<ul>
		<li><strong>Build data:</strong> <code>npm run build:data</code></li>
		<li>
			<strong>Names list:</strong>
			<code>/api/names/all.json</code>, <code>/api/names/boys.json</code>, <code>/api/names/girls.json</code>
		</li>
		<li>
			<strong>Per-name series:</strong>
			<code>/api/name/&lt;slug&gt;.json</code>
		</li>
		<li>
			<strong>Year data:</strong>
			<code>/api/year/2024.json</code>
		</li>
		<li>
			<strong>Top lists:</strong>
			<code>/api/top/2024.json</code>
		</li>
		<li>
			<strong>New entries:</strong>
			<code>/api/top/new/2024.json</code>
		</li>
		<li>
			<strong>Similarity series & neighbors:</strong>
			<code>/api/similar/series/girls/&lt;slug&gt;.json</code>
			and <code>/api/similar/girls/&lt;slug&gt;.json</code>
		</li>
		<li>
			<strong>Geography:</strong>
			<code>/api/geo/2024/girls.json</code>
		</li>
	</ul>

	<p>Use the <code>$lib/static-api</code> wrapper to query these files client-side.</p>
	<p>Ranks use shared ranking for equal counts (e.g. 1, 1, 3).</p>
</main>
