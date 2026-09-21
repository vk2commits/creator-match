import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {assistantPlugin} from './server/assistant';

export default defineConfig({ plugins: [react(),assistantPlugin()], base: './' });
