<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '@onsvisual/svelte-components/css/main.css';
	import { Main } from "@onsvisual/svelte-components"
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>
<Main>
{@render children()}
</Main>