import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// セッションと画像変換は使わないため、KV / IMAGES バインディングを無効にする
export default defineConfig({
  adapter: cloudflare({ imageService: 'passthrough' }),
  session: false,
});
