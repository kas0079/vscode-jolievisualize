import * as vscode from "vscode";
import * as path from "path";
import { SimpleRange } from "./global";
import { getVisFile } from "./extension";

export const getRangeWithSuffixToken = (
	document: vscode.TextDocument,
	range: SimpleRange,
	suffix: string
) => {
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

export const getRangeWithPrefixToken = (
	document: vscode.TextDocument,
	range: SimpleRange,
	prefix: string
) => {
	const codeRange = convertToVsCodeRange(document.getText(), range);
	const prefixOffset = document
		.getText()
		.substring(0, document.offsetAt(codeRange.start))
		.lastIndexOf(prefix);
	const startPos = document.positionAt(prefixOffset);
	return new vscode.Range(startPos, codeRange.end);
};

export const convertToVsCodeRange = (
	documentText: string,
	range: SimpleRange
) => {
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

export const openDocument = async (filename: string) => {
	if (vscode.workspace.workspaceFolders === undefined) return undefined;

	const fsPath = getVisFile();
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

export const findInDocument = (
	document: vscode.TextDocument,
	token: string,
	prefix = ""
) => {
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
