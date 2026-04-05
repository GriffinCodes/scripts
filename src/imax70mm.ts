import * as utils from "./utils";
import { arg } from "./utils";
import * as fs from "fs";
import * as path from "path";

const MOVIES = arg('movies').split(',');
if (!MOVIES)
	throw new Error('No movie specified, use --movies=movie-slugs');

const THEATERS = [
	'imax-indiana-state-museum',
	'cinemark-dallas-imax',
	'regal-opry-mills-imax',
	'regal-mall-georgia-imax',
];

const CACHE_FILE = path.join(__dirname, '..', 'resources', 'embeds-cache.json');

let previousEmbeds: { [key: string]: string } = {};

function formatDateString(dateStr: string): string {
	const year = dateStr.substring(0, 4);
	const month = dateStr.substring(4, 6);
	const day = dateStr.substring(6, 8);
	return `${month}/${day}/${year}`;
}

function loadCache(): void {
	try {
		if (fs.existsSync(CACHE_FILE)) {
			const data = fs.readFileSync(CACHE_FILE, 'utf-8');
			previousEmbeds = JSON.parse(data);
			console.log('Loaded cache from file with', Object.keys(previousEmbeds).length, 'entries');
		}
	} catch (error) {
		console.error('Error loading cache file:', error);
	}
}

function saveCache(): void {
	try {
		// Ensure the directory exists
		const dir = path.dirname(CACHE_FILE);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(CACHE_FILE, JSON.stringify(previousEmbeds, null, 2), 'utf-8');
	} catch (error) {
		console.error('Error saving cache file:', error);
	}
}

function createShowtimesEmbed(match: any, theater: any, result: any) {
	const fields: any[] = [];

	const event = result?.hits[0]?.events?.find(event => MOVIES.includes(event?.movie?.slug));

	if (!event || !event.showtimes) {
		return null;
	}

	const dates = Object.keys(event.showtimes).sort();

	for (const dateKey of dates) {
		const dateShowtimes = event.showtimes[dateKey].showtimes;
		const formattedDate = formatDateString(dateKey);

		const times = Object.keys(dateShowtimes).sort();
		const timeStrings: string[] = [];

		for (const time of times) {
			const showtime = dateShowtimes[time];
			const isSoldOut = showtime.type === 'Soldout';

			let timeDisplay: string;
			if (isSoldOut) {
				timeDisplay = `~~${time}~~ 🔴 SOLD OUT`;
			} else {
				const ticketUrl = showtime.ticketing?.fandango_url || showtime.ticketing?.override_url;
				if (ticketUrl) {
					timeDisplay = `[${time}](${ticketUrl})`;
				} else {
					timeDisplay = time;
				}
			}
			timeStrings.push(timeDisplay);
		}

		fields.push({
			name: formattedDate,
			value: timeStrings.join('\n') || 'No showtimes',
			inline: false
		});
	}

	const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(`${theater.address}, ${theater.city}, ${theater.state}`)}/`;
	const addressDisplay = `[${theater.address}, ${theater.city}, ${theater.state}](${mapsUrl})`;

	const runtime = event.movie?.runtime || match.runtime || 'N/A';
	const rating = event.movie?.mpaaRating || match.mpaaRating || 'N/A';

	const embed = {
		title: `${match.name} - ${event.movieVariantLabel}`,
		description: `Available at ${theater.name}\n${addressDisplay}`,
		fields: fields,
		color: 0x0072ce,
		thumbnail: {
			url: match.featuredPoster?.url || match.heroImage?.url
		},
		footer: {
			text: `Runtime: ${runtime} min | Rating: ${rating}`
		}
	};

	return embed;
}

async function checkTheaters() {
	for (const theater of THEATERS) {
		console.log('Looking for', MOVIES, 'at', theater, '...')

		const requestOptions: any = {
			method: "POST",
			headers: {
				"x-algolia-api-key": "7c9c8e2eadbdc26fb3b97b5db64a28dd",
				"x-algolia-application-id": "10MXKGB0UH",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				"query": theater,
				"page": 0
			}),
			redirect: "follow"
		};

		let response = await fetch("https://10mxkgb0uh-dsn.algolia.net/1/indexes/dev_web23_showtimes/query", requestOptions);
		let result: any = await response.json();

		let movies = result?.hits[0]?.events?.map(event => event?.movie);
		console.log('  Available movies', JSON.stringify(movies?.map(movie => movie?.name)))

		for (let MOVIE of MOVIES) {
			console.log('  Checking movie', MOVIE)
			let match = movies?.find(movie => movie?.slug === MOVIE);
			console.log('    Found match:', !!match)

			if (!!match) {
				const embed = createShowtimesEmbed(match, result.hits[0], result);

				if (embed) {
					const embedString = JSON.stringify(embed);
					const cacheKey = `${theater}-${MOVIE}`;

					// Only post if the embed is different from the previous one
					if (previousEmbeds[cacheKey] !== embedString) {
						console.log('    Embed changed for', cacheKey, '- notifying...')
						previousEmbeds[cacheKey] = embedString;
						saveCache();

						let webhookUrl = 'https://discord.com/api/webhooks/1490391461491900636/nqc4wd19oa6rSTl9Bw78hMfcd0xjKiCQ8Gm59zTARPfhnWA8TswiUCFyqG2veP2GIaGQ'

						fetch(webhookUrl, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({
								embeds: [embed]
							})
						})
					} else {
						console.log('    Embed unchanged for', cacheKey, '- skipping notification')
					}
				}
			}
		}


		await utils.sleep(1000)
	}
	console.log()
}

(async () => {
	console.log('Starting showtime checker...')
	loadCache();
	checkTheaters();
	setInterval(() => checkTheaters(), 60000);
})();