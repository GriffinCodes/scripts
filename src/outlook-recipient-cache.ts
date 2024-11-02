import {PSTFile, PSTFolder} from 'pst-extractor';
import path from 'path';
import * as utils from './utils';

let db: { [name: string]: string } = {};

function processFolder(folder: PSTFolder) {
	if (folder.hasSubfolders)
		for (let childFolder of folder.getSubFolders())
			processFolder(childFolder);

	if (folder.displayName !== 'Recipient Cache')
		return;

	if (folder.contentCount <= 0)
		return;

	let entry = folder.getNextChild();
	while (entry != null) {
		if (entry.messageClass === 'IPM.Contact' && entry.email1EmailAddress.includes('@'))
			db[entry.displayName] = entry.email1EmailAddress;
		entry = folder.getNextChild();
	}
}

function formatName(name) {
	return name.replace(/^'(.*)'$/g, '$1').replace(/[\u200B-\u200D\uFEFF\n]/g, '')
}

processFolder(new PSTFile(path.resolve('node/resources/outlook.ost')).getRootFolder());

utils.writeFile('../resources/outlook.csv', Object.entries(db)
	.map(([displayName, emailAddress]) => `${formatName(displayName)},${emailAddress}`)
	.sort((a, b) => a.localeCompare(b))
	.join('\n'));

































