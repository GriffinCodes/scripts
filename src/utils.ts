import fs, {mkdirSync, WriteFileOptions} from "fs";
import path from "path";
import request from 'request';

export let debug = arg('debug');
console.debug = (...data) => {
	if (debug)
		console.log(...data);
}

export function arg(key, defaultValue: any = false) {
	let match = process.argv.find(arg => arg.startsWith(`--${key}`));
	if (!match)
		return defaultValue;

	if (match.includes("="))
		return splitLikeJava(match, '=', 2)[1]
	else
		return true;
}

export function clone(obj: any) {
	if (Array.isArray(obj))
		return [...obj]
	if (obj.constructor)
		return Object.assign(Object.create(Object.getPrototypeOf(obj)), obj)
	return JSON.parse(JSON.stringify(obj));
}

export function randomElement<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}

export function wait(ms, func) {
	return setTimeout(func, ms);
}

export function file(fileName: string) {
	return path.join(__dirname, fileName);
}

export function readFile(fileName) {
	try {
		return fs.readFileSync(file(fileName), 'utf8');
	} catch (ex) {
		console.log(`File ${fileName} not found`)
		return null;
	}
}

export function writeFile(fileName, content, encoding: WriteFileOptions = 'utf8') {
	fs.writeFile(file(fileName), content, encoding, err => {
		if (err) {
			console.error(err);
		} else {
			// file written successfully
		}
	});
}

export function getFolder(folder: string) {
	if (!fs.existsSync(folder))
		mkdirSync(folder)

	return folder;
}

export function isoTimestamp() {
	return (new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000))).toISOString().slice(0, -1);
}

export function parseISOString(iso) {
	var split = iso.split(/\D+/);
	return new Date(Date.UTC(split[0], --split[1], split[2], split[3], split[4], split[5], split[6]));
}

export function indexesOf(string, search) {
	var indices = [];
	for (var i = 0; i < string.length; i++)
		if (string[i] === search)
			indices.push(i);
	return indices;
}

// https://stackoverflow.com/a/64296576
export function splitLikeJava(input, separator, limit) {
	separator = new RegExp(separator, 'g');
	limit = limit ?? -1;

	const output = [];
	let finalIndex = 0;

	while (--limit) {
		const lastIndex = separator.lastIndex;
		const search = separator.exec(input);
		if (search === null) {
			break;
		}
		finalIndex = separator.lastIndex;
		output.push(input.slice(lastIndex, search.index));
	}

	output.push(input.slice(finalIndex));

	return output;
}

export function webRequest(req) {
	if (debug) console.log("Sending request", req)
	return new Promise((resolve, reject) => {
		request(req, (error, response) => {
			if (error) {
				reject(error);
			} else {
				resolve(JSON.parse(response.body));
			}
		});
	});
}