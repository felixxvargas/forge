import type { StorybookConfig } from '@storybook/nextjs-vite';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Handles `import Foo from '*.svg?react'` in Storybook (Vite 8 / rolldown).
// vite-plugin-svgr emits JSX which rolldown can't parse; this plugin instead
// reads the SVG file and returns a plain-JS React component via createElement.
const svgReactPlugin = {
  name: 'storybook-svg-react',
  enforce: 'pre' as const,
  resolveId(id: string, importer?: string) {
    if (!id.includes('.svg?react')) return;
    const svgPath = id.split('?')[0];
    const abs = importer
      ? resolve(dirname(importer.split('?')[0]), svgPath)
      : resolve(svgPath);
    return '\0svg-react:' + abs;
  },
  load(id: string) {
    if (!id.startsWith('\0svg-react:')) return;
    const filePath = id.slice('\0svg-react:'.length);
    const svg = readFileSync(filePath, 'utf-8');
    return (
      "import * as React from 'react';\n" +
      'export default function SvgIcon(props) {\n' +
      '  return React.createElement("span", {\n' +
      '    style: { display: "inline-flex", lineHeight: 0 },\n' +
      '    className: props.className,\n' +
      '    "aria-hidden": props["aria-hidden"],\n' +
      '    dangerouslySetInnerHTML: { __html: ' + JSON.stringify(svg) + ' }\n' +
      '  });\n' +
      '}'
    );
  },
};

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-themes',
    '@storybook/addon-designs',
    '@storybook/addon-docs',
    '@storybook/addon-controls',
    '@storybook/addon-actions',
  ],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  async viteFinal(config) {
    config.plugins = [...(config.plugins ?? []), svgReactPlugin];
    config.resolve = {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias ?? {}),
        'motion/react': resolve(__dirname, './mocks/motion.tsx'),
      },
    };
    return config;
  },
};

export default config;
