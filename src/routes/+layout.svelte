<script lang="ts">
import favicon from '#lib/assets/favicon.svg';
import '#lib/styles/tokens.css';
import type { LayoutProps } from './$types';

let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>GK2 Crafting Calculator</title>
</svelte:head>

{@render children()}
