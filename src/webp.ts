import { arg } from "./utils";
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const inputDir = '../../../git/CMS/images/minigames/';

fs.readdir(inputDir, (err, files) => {
	if (err) {
		return console.error('Error reading input directory:', err);
	}

	files.filter(file => file.endsWith('.png')).forEach(async file => {
		let inputPath = path.join(inputDir, file);
		try {
			const tempOutputPath = `${inputPath}.webp`;
			if (!arg('dry')) {
				await sharp(inputPath).webp().toFile(tempOutputPath);
				fs.rmSync(inputPath);
			}
			console.log(`Converted and overwrote: ${inputPath}`);
		} catch (error) {
			console.error(`Error converting ${inputPath}:`, error);
		}
	});
});