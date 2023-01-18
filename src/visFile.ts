import * as vscode from "vscode";
import { findInDocument, openDocument } from "./utils";

export type TLS = {
	file: string;
	target?: string;
	params?: string;
	instances: number;
};

export const getVisFileContent = async (file: vscode.Uri) => {
	const document = await vscode.workspace.openTextDocument(file);
	return JSON.parse(document.getText()) as TLS[][];
};

export const hasTargetNameChanged = async (tls: TLS) => {
	const document = await openDocument(tls.file);
	if (!document) return false;
	const found = findInDocument(document, "{", `ervice ${tls.target}`);
	return found === undefined;
};

export const getAllTopServiceFiles = async (visFile: vscode.Uri) => {
	const content = await getVisFileContent(visFile);
	const p = visFile.fsPath.substring(0, visFile.fsPath.lastIndexOf("/"));
	return content
		.flat()
		.flatMap((t) => p + t.file)
		.filter(async (f) => {
			await vscode.workspace.openTextDocument(vscode.Uri.parse(f));
		});
};
