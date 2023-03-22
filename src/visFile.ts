import * as vscode from "vscode";
import { findInDocument, openDocument } from "./utils";
import { TLS } from "./global";

export const getVisFileContent = async (file: vscode.Uri): Promise<TLS[][]> => {
	const document = await vscode.workspace.openTextDocument(file);
	return JSON.parse(document.getText()) as TLS[][];
};

export const hasTargetNameChanged = async (tls: TLS): Promise<boolean> => {
	if (!tls.file) return false;
	const document = await openDocument(tls.file);
	if (!document) return false;
	const found = findInDocument(document, "{", `ervice ${tls.target}`);
	return found === undefined;
};

export const getAllTopServiceFiles = async (
	visFile: vscode.Uri
): Promise<string[]> => {
	const content = await getVisFileContent(visFile);
	const p = visFile.fsPath.substring(0, visFile.fsPath.lastIndexOf("/"));
	return content
		.flat()
		.filter((t) => t.file)
		.flatMap((t) => p + (t.file?.startsWith("/") ? t.file : "/" + t.file))
		.filter(async (f) => {
			await vscode.workspace.openTextDocument(vscode.Uri.parse(f));
		});
};
