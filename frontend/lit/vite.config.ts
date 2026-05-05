import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: '127.0.0.1',
    open: false,
    allowedHosts: ['127.0.0.1', 'localhost', 'host.docker.internal'],
  },
  esbuild: {
    target: 'es2022',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
});
