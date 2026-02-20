# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv create --template minimal --types ts --add prettier eslint sveltekit-adapter="adapter:auto" --install npm ./
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Data artifacts (static/api)

The build step `npm run build:data` generates JSON files under [static/api](static/api). These are used as static API responses.

- Metadata: [static/api/meta.json](static/api/meta.json)
	- Shape: `{ years: number[], geoYears: { boys: number[], girls: number[] } }`
- Year data: [static/api/year/2024.json](static/api/year)
	- Shape: `{ year: number, boys: { name: string, count: number | null }[], girls: { name: string, count: number | null }[] }`
	- Historical decade years include rank-only entries with `count: null`.
- Names lists: [static/api/names/all.json](static/api/names), [static/api/names/boys.json](static/api/names), [static/api/names/girls.json](static/api/names)
	- Shape: `{ name: string, slug: string }[]`
- Name series (per name): [static/api/name/<slug>.json](static/api/name)
	- Shape: `{ name: string, slug: string, boys: { year: number, count: number | null, rank: number }[], girls: { year: number, count: number | null, rank: number }[] }`
- Top lists: [static/api/top/2024.json](static/api/top)
	- Shape: `{ year: number, boys: { rank: number, name: string, count: number | null }[], girls: { rank: number, name: string, count: number | null }[] }`
- Geography by year+sex: [static/api/geo/2024/boys.json](static/api/geo)
	- Shape: `{ year: number, sex: "boys" | "girls", areas: { code: string, areaName: string, geography: string, topNames: string[], count: number | null }[] }`
- Similarity series (per name): [static/api/similar/series/boys/<slug>.json](static/api/similar/series)
	- Shape: `{ name: string, sex: "boys" | "girls", ranks: { year: number, rank: number }[] }`
- Similarity neighbors (precomputed): [static/api/similar/boys/<slug>.json](static/api/similar)
	- Shape: `{ name: string, slug: string, sex: "boys" | "girls", minYears: number, neighbors: { name: string, slug: string, sse: number, overlapYears: number }[] }`
