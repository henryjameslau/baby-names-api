import path from 'node:path';
import fs from 'node:fs/promises';
import xlsx from 'xlsx';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'src/data');
const OUT_DIR = path.join(ROOT, 'static/data');
const SOURCE_FILE = path.join(DATA_DIR, 'babynames1996to2024.xlsx');

const SEX_SHEETS = [
	{ sheet: 'Table_1', sex: 'girls' },
	{ sheet: 'Table_2', sex: 'boys' }
];

function findHeaderIndex(rows) {
	for (let i = 0; i < rows.length; i += 1) {
		const row = rows[i].map((value) => String(value).toLowerCase());
		if (row.includes('name') && row.some((value) => value.includes('count'))) {
			return i;
		}
	}
	return -1;
}

function extractYearColumns(headerRow) {
	const yearColumns = new Map();
	for (let i = 0; i < headerRow.length; i += 1) {
		const cell = String(headerRow[i]);
		const match = cell.match(/(\d{4})\s*count/i);
		if (match) {
			yearColumns.set(Number(match[1]), i);
		}
	}
	return yearColumns;
}

function normalizeName(value) {
	return String(value).trim();
}

function isValidNumber(value) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return true;
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed !== '' && Number.isFinite(Number(trimmed));
	}
	return false;
}

function toNumber(value) {
	return typeof value === 'number' ? value : Number(String(value).trim());
}

async function build() {
	await fs.mkdir(OUT_DIR, { recursive: true });

	const workbook = xlsx.readFile(SOURCE_FILE);
	const yearMap = new Map();

	for (const { sheet, sex } of SEX_SHEETS) {
		const worksheet = workbook.Sheets[sheet];
		if (!worksheet) {
			throw new Error(`Missing worksheet ${sheet} in ${SOURCE_FILE}`);
		}
		const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
		const headerIndex = findHeaderIndex(rows);
		if (headerIndex === -1) {
			throw new Error(`Header row not found in ${sheet}`);
		}
		const headerRow = rows[headerIndex];
		const yearColumns = extractYearColumns(headerRow);

		for (let i = headerIndex + 1; i < rows.length; i += 1) {
			const row = rows[i];
			const rawName = row[0];
			if (!rawName) continue;
			const name = normalizeName(rawName);
			if (!name) continue;

			for (const [year, columnIndex] of yearColumns.entries()) {
				const value = row[columnIndex];
				if (!isValidNumber(value)) continue;
				const count = toNumber(value);
				const yearEntry = yearMap.get(year) ?? {
					year,
					boys: [],
					girls: []
				};
				yearEntry[sex].push({ name, count });
				yearMap.set(year, yearEntry);
			}
		}
	}

	const years = Array.from(yearMap.keys()).sort((a, b) => a - b);
	for (const year of years) {
		const entry = yearMap.get(year);
		entry.boys.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
		entry.girls.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
		const outPath = path.join(OUT_DIR, `year-${year}.json`);
		await fs.writeFile(outPath, JSON.stringify(entry));
	}

	const metaPath = path.join(OUT_DIR, 'meta.json');
	await fs.writeFile(metaPath, JSON.stringify({ years }));

	console.log(`Built ${years.length} year files in ${OUT_DIR}`);
}

build().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
