import * as vscode from "vscode";
import * as path from "path";
import { SimpleRange } from "./global";
import { getVisFileURI } from "./extension";

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
	const tempString = documentText.substring(0, positionOftext);
	const lineNumber = tempString.split("\n").length - 1;

	return new vscode.Position(
		lineNumber,
		document
			.lineAt(lineNumber)
			.text.indexOf(
				searchString.split(" ")[searchString.split(" ").length - 1]
			)
	);
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
