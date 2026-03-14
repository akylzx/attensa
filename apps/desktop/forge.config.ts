import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';

import fs from 'fs';
import path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'Attensa',
  },
  hooks: {
    packageAfterCopy: async (_config, buildPath) => {
      const rootModules = path.resolve(__dirname, '../../node_modules');
      const nativeModules = ['better-sqlite3', 'active-win', 'bindings', 'file-uri-to-path', 'node-addon-api'];

      for (const mod of nativeModules) {
        const src = path.join(rootModules, mod);
        const dest = path.join(buildPath, 'node_modules', mod);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.cpSync(src, dest, { recursive: true});
        }
      }
    }
  },
  makers: [
    new MakerSquirrel({
      name: 'Attensa',
      setupExe: 'AttensaSetup.exe',
      authors: 'Attensa',
      description: 'Attensa Desktop App',
    }),
    new MakerZIP({}, ['darwin']),
    new MakerDMG({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};

export default config;