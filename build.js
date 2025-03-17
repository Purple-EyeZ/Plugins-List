import esbuild from 'esbuild';
import htmlMinifier from 'html-minifier-terser';
import { glob } from 'glob';
import { rm, mkdir, copyFile, readFile, writeFile } from 'fs/promises';
import path from 'path';

const PATHS = {
  src: 'src',
  dist: 'dist',
  staticExtensions: '{svg,png,webp,webm,gif}'
};

const processFile = async (inputPath, content) => {
  const outputPath = inputPath.replace(PATHS.src, PATHS.dist);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content);
  return outputPath;
};

// Minify functions
const minifyFunctions = {
  async html() {
    const files = await glob(`${PATHS.src}/**/*.html`);
    return Promise.all(files.map(async file => {
      try {
        const content = await readFile(file, 'utf8');
        const minified = await htmlMinifier.minify(content, {
          collapseWhitespace: true,
          removeComments: true,
          removeAttributeQuotes: true,
          removeEmptyAttributes: true,
        });
        return processFile(file, minified);
      } catch (err) {
        console.error(`Error processing HTML file ${file}:`, err);
        throw err;
      }
    }));
  },

  async css() {
    const files = await glob(`${PATHS.src}/**/*.css`);
    return Promise.all(files.map(async file => {
      try {
        const content = await readFile(file, 'utf8');
        const { code } = await esbuild.transform(content, {
          loader: 'css',
          minify: true
        });
        return processFile(file, code);
      } catch (err) {
        console.error(`Error processing CSS file ${file}:`, err);
        throw err;
      }
    }));
  },

  async json() {
    const files = await glob(`${PATHS.src}/**/*.json`);
    return Promise.all(files.map(async file => {
      try {
        const content = await readFile(file, 'utf8');
        const minified = JSON.stringify(JSON.parse(content), null, 0);
        return processFile(file, minified);
      } catch (err) {
        console.error(`Error processing JSON file ${file}:`, err);
        throw err;
      }
    }));
  }
};

// ESBuild configuration
const esbuildConfig = {
  outdir: PATHS.dist,
  outbase: PATHS.src,
  bundle: false,
  minify: true,
  sourcemap: false,
  target: ['es2015'],
  loader: {
    '.js': 'js',
    '.png': 'file',
    '.svg': 'file',
    '.webp': 'file'
  }
};

// Build process
const build = async (clean = true) => {
  console.time('Build completed in');
  
  try {
    if (clean) {
      await rm(PATHS.dist, { recursive: true, force: true });
      console.log('📁 Cleaned dist directory');
    }

    console.log('🚀 Starting build process...');

    await Promise.all([
      minifyFunctions.html(),
      minifyFunctions.css(),
      minifyFunctions.json()
    ]);
    console.log('✨ Minification completed');

    const jsFiles = await glob(`${PATHS.src}/**/*.js`);
    await esbuild.build({
      ...esbuildConfig,
      entryPoints: jsFiles
    });
    console.log('📦 JavaScript files processed');

    const staticFiles = await glob(`${PATHS.src}/**/*.${PATHS.staticExtensions}`);
    await Promise.all(
      staticFiles.map(file => {
        const outputPath = file.replace(PATHS.src, PATHS.dist);
        return mkdir(path.dirname(outputPath), { recursive: true })
          .then(() => copyFile(file, outputPath));
      })
    );
    console.log('📂 Static files copied');

  } catch (err) {
    console.error('❌ Build failed:', err);
    process.exit(1);
  }

  console.timeEnd('Build completed in');
};

const args = process.argv.slice(2);
const skipClean = args.includes('--no-clean');

build(!skipClean).catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});