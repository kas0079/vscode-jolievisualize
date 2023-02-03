import * as vscode from "vscode";
import * as path from "path";
import { SimpleRange } from "./global";

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

// export const convertToVsCodeRange = (
// 	documentText: string,
// 	range: SimpleRange
// ): vscode.Range => {
// 	let startChar = range.start.char;
// 	let endChar = range.end.char;

// 	if (range.start.char < 0)
// 		startChar =
// 			documentText.split("\n")[range.start.line].length +
// 			range.start.char +
// 			1;

// 	if (range.end.char < 0)
// 		endChar =
// 			documentText.split("\n")[range.end.line].length +
// 			range.end.char +
// 			1;

// 	return new vscode.Range(
// 		new vscode.Position(range.start.line, startChar),
// 		new vscode.Position(range.end.line, endChar)
// 	);
// };
// export const getServiceText = (
// 	document: vscode.TextDocument,
// 	serviceName: string
// ) => {
// 	const serviceNamePos = findInDocument(
// 		document,
// 		"{",
// 		`ervice ${serviceName}`
// 	);

// 	if (!serviceNamePos) return false;

// 	const textArray = splitDocumentText(document, serviceNamePos);
// 	const svcClosing = findClosingBrace(textArray, serviceNamePos.line);
// 	if (!svcClosing) return false;

// 	return {
// 		pos: serviceNamePos,
// 		text: document.getText(new vscode.Range(serviceNamePos, svcClosing)),
// 	};
// };

// export const findScopeRangeInServiceScope = (
// 	document: vscode.TextDocument,
// 	serviceName: string,
// 	token: string
// ) => {
// 	const serviceTextResult = getServiceText(document, serviceName);
// 	if (!serviceTextResult) return false;

// 	const tokenPositionInService = findInDocumentText(
// 		serviceTextResult.text,
// 		`${token}`
// 	);
// 	if (!tokenPositionInService) return false;

// 	const tokenPositionInDocument = new vscode.Position(
// 		tokenPositionInService.line + serviceTextResult.pos.line,
// 		tokenPositionInService.character - 1
// 	);

// 	const closingBracket = findClosingBrace(
// 		splitDocumentText(document, tokenPositionInDocument),
// 		tokenPositionInDocument.line
// 	);
// 	if (!closingBracket) return false;

// 	return new vscode.Range(tokenPositionInDocument, closingBracket);
// };

// export const findClosingBrace = (
// 	texts: string[],
// 	lineOffset = 0,
// 	braceType = ["{", "}"]
// ) => {
// 	let count = 0;
// 	let startFound = false;
// 	for (let l = 0; l < texts.length; l++) {
// 		for (let c = 0; c < texts[l].length; c++) {
// 			const char = texts[l].charAt(c);
// 			if (char === braceType[0]) {
// 				count++;
// 				startFound = true;
// 			} else if (char === braceType[1]) count--;

// 			if (count === 0 && startFound)
// 				return new vscode.Position(l + lineOffset, c + 1);
// 		}
// 	}
// 	return undefined;
// };

export const openDocument = async (filename: string) => {
	if (vscode.workspace.workspaceFolders === undefined) return undefined;

	const filePath = path.join(
		`${vscode.workspace.workspaceFolders[0].uri}${filename}`
	);
	const document = await vscode.workspace.openTextDocument(
		vscode.Uri.parse(filePath)
	);

	return document;
};

// export const findTokenInServiceText = (
// 	document: vscode.TextDocument,
// 	serviceName: string,
// 	searchString: string,
// 	prefix: string
// ) => {
// 	const serviceText = getServiceText(document, serviceName);
// 	if (!serviceText) return false;

// 	const posInService = findInDocumentText(
// 		serviceText.text,
// 		searchString,
// 		prefix
// 	);
// 	if (!posInService) return false;

// 	return posInService.translate(
// 		serviceText.pos.line,
// 		serviceText.pos.character
// 	);
// };

// export const findInDocumentText = (
// 	text: string,
// 	token: string,
// 	prefix = ""
// ) => {
// 	const searchString = `${prefix === "" ? prefix : prefix + " "}${token}`;
// 	const positionOftext = text.indexOf(searchString);
// 	if (positionOftext < 0) return undefined;
// 	const tempString = text.substring(0, positionOftext);
// 	const lineNumber = tempString.split("\n").length - 1;

// 	return new vscode.Position(
// 		lineNumber,
// 		text.split("\n")[lineNumber].indexOf(searchString) + prefix.length
// 	);
// };

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

// const splitDocumentText = (
// 	document: vscode.TextDocument,
// 	offset: vscode.Position
// ) => {
// 	const documentText = document
// 		.getText()
// 		.split("\n")
// 		.slice(offset.line)
// 		.join("\n");

// 	return documentText.substring(offset.character).split("\n");
// };
