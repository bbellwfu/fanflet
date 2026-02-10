const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../medium_logo_mark.png');
const APP_PUBLIC = path.join(__dirname, 'public');
const MARKETING_PUBLIC = path.join(__dirname, '../marketing_site/public');

async function processLogo() {
    try {
        console.log(`Processing ${INPUT_FILE}...`);

        // 1. Load and trim whitespace
        const image = sharp(INPUT_FILE).trim();
        const metadata = await image.metadata();

        // 2. Calculate dimensions for square canvas with margin
        const size = Math.max(metadata.width, metadata.height);
        const margin = Math.round(size * 0.1); // 10% margin
        const canvasSize = size + (margin * 2);

        // 3. Create centered square version
        const squareLogo = await image
            .extend({
                top: margin + Math.round((size - metadata.height) / 2),
                bottom: margin + Math.round((size - metadata.height) / 2),
                left: margin + Math.round((size - metadata.width) / 2),
                right: margin + Math.round((size - metadata.width) / 2),
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .resize(512, 512)
            .toBuffer();

        console.log('Logo processed into square format.');

        // 4. Generate variants
        const variants = [
            { name: 'logo.png', size: 512 },
            { name: 'icon.png', size: 192 },
            { name: 'apple-icon.png', size: 180 },
            { name: 'favicon.ico', size: 32, format: 'png' } // naive
        ];

        for (const v of variants) {
            // App Public
            await sharp(squareLogo)
                .resize(v.size, v.size)
                .toFile(path.join(APP_PUBLIC, v.name));

            // Marketing Public
            await sharp(squareLogo)
                .resize(v.size, v.size)
                .toFile(path.join(MARKETING_PUBLIC, v.name));

            console.log(`Generated ${v.name}`);
        }

        console.log('All assets generated successfully!');

    } catch (error) {
        console.error('Error processing logo:', error);
        process.exit(1);
    }
}

processLogo();
