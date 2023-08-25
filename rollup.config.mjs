import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';
import pkg from './package.json' assert { type: "json" }

export default [
    // CommonJS (for Node) and ES module (for bundlers) build.
    // (We could have three entries in the configuration array
    // instead of two, but it's quicker to generate multiple
    // builds from a single configuration where possible, using
    // an array for the `output` option, where we can specify 
    // `file` and `format` for each target)
    {
        input: 'src/index.ts',
        // external: ['ms'],
        plugins: [
            // babel({ 
            //     exclude: 'node_modules/**',
            //     presets: ['@babel/env', '@babel/preset-react']
            // }),
            typescript({
                tsconfig: './tsconfig.rollup.json',
                declaration: true,
                declarationDir: 'dist',
            }) // so Rollup can convert TypeScript to JavaScript
        ],
        output: [
            { file: pkg.exports.require, format: 'cjs' },
            { file: pkg.exports.import, format: 'es' }
        ],
        external: ['react', 'react-dom', 'use-immer'],
    }
];