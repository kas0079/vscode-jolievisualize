import * as path from "path";
import * as vscode from "vscode";
import * as fs from "fs";
import { getVisFileURI } from "./extension";
import { SimpleRange } from "./global";

/**
 * Looks through all OL files and finds a token of a certain type. This can be
 * interfaces, types, services and so on.
 * @param token Token to look for
 * @param type Which type to look for (interface, service, type etc...)
 * @returns file path if the token was found, undefined if not found.
 */
export const findTokenInProject = async (
	token: string,
	type: string
): Promise<string | undefined> => {
	const rootFolder = vscode.workspace.workspaceFolders?.at(0);
	if (!rootFolder) return undefined;
	const allOlFiles = getAllOlFilesInDir(rootFolder.uri.fsPath);

	for (const file of allOlFiles) {
		const document = await openDocument(file);
		if (!document) continue;
		const allOccurences = findAllOccurrencesInDocument(document, type);
		const names = allOccurences
			.map((index) => {
				let word = document.getWordRangeAtPosition(
					document.positionAt(index + type.length + 1)
				);
				let i = 1;
				while (!word) {
					i += 2;
					word = document.getWordRangeAtPosition(
						document.positionAt(index + type.length + i)
					);
				}
				const name = document.getText(word).trim();
				return name.includes(" ") ||
					name.includes("	") ||
					name.includes("\n") ||
					name.length !== token.length
					? ""
					: name;
			})
			.filter((t) => t !== "");
		if (names.includes(token)) return file;
	}
	return undefined;
};

/**
 * @param importedFile file path to find the relative path to
 * @param mainFile file path to find the relative path from
 * @returns relative path from mainFile to importedFile
 */
export const removeCommonPathPrefix = (
	importedFile: string,
	mainFile: string
): string => {
	return path.relative(path.dirname(mainFile), importedFile);
};

/**
 * Converts a path string into the path notation used when importing in Jolie
 * @param path Path as string
 * @returns Jolie path
 */
export const formatToJoliePath = (path: string) => {
	const tmp = path
		.replaceAll("../", ".")
		.replaceAll("/", ".")
		.replace(".ol", "");
	return "." + tmp;
};

/**
 * Checks if a token from a file already is imported either as token or star.
 * @param document Document to check for imports
 * @param importName Token to check
 * @param joliePath file path to where the token is declared in jolie import path notation
 * @param importPos position of the import file statement
 * @param keywords keywords to check to make sure that the token actually couldn't be some name of other things in the file
 * @returns true if import already exists in file
 */
export const isTokenAnImport = (
	document: vscode.TextDocument,
	importName: string,
	joliePath: string,
	importPos: vscode.Position,
	keywords: string[]
): boolean => {
	const starPos = findInDocumentFromPosition(
		document,
		"*",
		importPos.translate(0, joliePath.length)
	);
	const tokenPos = findInDocumentFromPosition(
		document,
		importName,
		importPos.translate(0, joliePath.length)
	);
	if (!tokenPos && !starPos) return false;

	const tokenOrStar = [starPos, tokenPos]
		.map((t) => (t === undefined ? -1 : document.offsetAt(t)))
		.filter((t) => t >= 0)
		.sort((a, b) => a - b)[0];

	const closestKeyword = keywords
		.map((t) => {
			const pos = findInDocumentFromPosition(
				document,
				t,
				importPos.translate(0, joliePath.length)
			);
			if (!pos) return -1;
			return document.offsetAt(pos);
		})
		.filter((t) => t >= 0)
		.sort((a, b) => a - b)[0];

	return tokenOrStar < closestKeyword;
};

/**
 * @param document Document to search in
 * @param range text range to base the search from
 * @param suffix token to include in the range
 * @returns vscode range ranging over the initial range and the token in the text.
 */
export const getRangeWithSuffixToken = (
	document: vscode.TextDocument,
	range: SimpleRange,
	suffix: string
): vscode.Range => {
	const codeRange = convertToVsCodeRange(document.getText(), range);
	const suffixOffset = document
		.getText()
		.substring(document.offsetAt(codeRange.start))
		.indexOf(suffix);
	const endPos = document
		.positionAt(suffixOffset)
		.translate(codeRange.start.line, codeRange.start.character + 1);
	return new vscode.Range(codeRange.start, endPos);
};

/**
 * @param document Document to search in
 * @param range text range to base the search from
 * @param prefix token to include in the range
 * @returns vscode range ranging over the initial range and the token in the text.
 */
export const getRangeWithPrefixToken = (
	document: vscode.TextDocument,
	range: SimpleRange,
	prefix: string
): vscode.Range | -1 => {
	const codeRange = convertToVsCodeRange(document.getText(), range);
	const prefixOffset = document
		.getText()
		.substring(0, document.offsetAt(codeRange.start))
		.lastIndexOf(prefix);
	if (prefixOffset < 0) return -1;
	const startPos = document.positionAt(prefixOffset);
	return new vscode.Range(startPos, codeRange.end);
};

/**
 * Converts the text range given from the svelte UI into a useable vscode Range object.
 * @param documentText Text of the document the range is based out of
 * @param range text range from the svelte UI
 * @returns vscode.Range object ranging over the same code as the input range.
 */
export const convertToVsCodeRange = (
	documentText: string,
	range: SimpleRange
): vscode.Range => {
	let startLine = range.start.line;
	let startChar = range.start.char;
	let endChar = range.end.char;
	let endLine = range.end.line;

	if (startChar < 0) {
		startLine--;
		startChar = documentText.split("\n")[startLine].length + startChar + 1;
	}

	if (endChar < 0) {
		endLine--;
		endChar = documentText.split("\n")[endLine].length + endChar + 1;
	}

	return new vscode.Range(
		new vscode.Position(startLine, startChar),
		new vscode.Position(endLine, endChar)
	);
};

/**
 * @param filename filename of the document to open
 * @returns vscode TextDocument object if the file can be opened. Else undefined
 */
export const openDocument = async (
	filename: string
): Promise<vscode.TextDocument | undefined> => {
	if (vscode.workspace.workspaceFolders === undefined) return undefined;

	const fsPath = getVisFileURI();
	if (!fsPath) return undefined;

	const filePath = path.join(
		`${path.dirname(fsPath.fsPath)}${
			filename.startsWith("/") ? filename : "/" + filename
		}`
	);
	const document = await vscode.workspace.openTextDocument(
		vscode.Uri.parse(filePath)
	);

	return document;
};

/**
 * Finds the position of a token in a document
 * @param document document to search in
 * @param token token to search for
 * @param prefix optional prefix of the searched string
 * @returns vscode Position of the token in the text. Undefined if token was not found.
 */
export const findInDocument = (
	document: vscode.TextDocument,
	token: string,
	prefix = ""
): vscode.Position | undefined => {
	const documentText = document.getText();

	const searchString = `${prefix === "" ? prefix : prefix + " "}${token}`;
	const positionOftext = documentText.indexOf(searchString);
	if (positionOftext < 0) return undefined;
	return document.positionAt(positionOftext);
};

export const findInDocumentFromPosition = (
	document: vscode.TextDocument,
	token: string,
	startPos: vscode.Position
): vscode.Position | undefined => {
	const documentText = document.getText(
		new vscode.Range(
			startPos,
			document.positionAt(document.getText().length)
		)
	);
	const searchString = `${token}`;
	const positionOftext = documentText.indexOf(searchString);
	if (positionOftext < 0) return undefined;
	return document.positionAt(positionOftext + document.offsetAt(startPos));
};

/**
 * Check if a port range is an explicit port definition or made from an 'embed ... as ...'
 * @param document document containing the port
 * @param range text range of the port
 * @returns true if port is created implicitly by an embed
 */
export const isPortRangeAnEmbedding = (
	document: vscode.TextDocument,
	range: SimpleRange
): boolean => {
	const rangeText = document.getText(
		convertToVsCodeRange(document.getText(), range)
	);
	return !rangeText.includes("{");
};

/**
 * @param document Document to look in
 * @param token Token to look for
 * @returns List of number of indeces
 */
const findAllOccurrencesInDocument = (
	document: vscode.TextDocument,
	token: string
): number[] => {
	const result: number[] = [];
	let i: number = document.getText().indexOf(token);
	while (i !== -1) {
		result.push(i);
		i = document.getText().indexOf(token, i + 1);
	}
	return result;
};

/**
 * Find all OL files, recursively, from the project root folder.
 * @param rootDirPath Root path of the project
 * @param result Previous recursive step's result. Should always be empty array when first calling the function.
 * @returns List of paths to OL files
 */
const getAllOlFilesInDir = (
	rootDirPath: string,
	result: string[] = []
): string[] => {
	const visFile = getVisFileURI();
	if (!visFile) return result;
	fs.readdirSync(rootDirPath).forEach((c) => {
		if (fs.statSync(path.join(rootDirPath, c)).isDirectory())
			getAllOlFilesInDir(path.join(rootDirPath, c), result);
		else if (fs.existsSync(path.join(rootDirPath, c)) && c.endsWith(".ol"))
			result.push(
				path.relative(
					path.dirname(visFile.fsPath),
					path.join(rootDirPath, c)
				)
			);
	});
	return result;
};
