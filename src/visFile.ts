import * as vscode from "vscode";
import { findInDocument, openDocument } from "./utils";
import { TLS } from "./global";
import WebPanel from "./WebPanel";
import { setIntercept } from "./extension";

/**
 * @param file architecture file URI
 * @returns the content of the architecture file as an object
 */
export const getVisFileContent = async (file: vscode.Uri): Promise<TLS[][]> => {
	const document = await vscode.workspace.openTextDocument(file);
	return JSON.parse(document.getText()) as TLS[][];
};

/**
 * Replaces the content of the architecture string with new content from the svelte UI
 * @param visfileContent new architecture file content
 */
export const setVisfileContent = async (
	visfileContent: string
): Promise<void> => {
	const jsonContent = JSON.parse(visfileContent);
	const contentString = JSON.stringify(jsonContent.content);
	if (
		vscode.workspace.workspaceFolders === undefined ||
		WebPanel.visFileContent === contentString
	) {
		setIntercept(false);
		return;
	}

	WebPanel.visFileContent = contentString;

	const document = await vscode.workspace.openTextDocument(WebPanel.visFile);
	const numOfLines = document.lineCount - 1;
	const lastCharPor = document.lineAt(numOfLines).text.length;

	const edit = new vscode.WorkspaceEdit();
	edit.replace(
		WebPanel.visFile,
		new vscode.Range(
			new vscode.Position(0, 0),
			new vscode.Position(numOfLines, lastCharPor)
		),
		contentString
	);

	await vscode.workspace.applyEdit(edit);
	const success = await document.save();
	setIntercept(false);

	if (!success) {
		vscode.window.showErrorMessage(
			`Could not overwrite visualization file: ${document.fileName}`
		);
	}
};

/**
 * Checks if an edit in the code has changed the name of a service in the architecture file
 * @param tls Top Level Service
 * @returns true if edit has changed a service in the architecture file
 */
export const hasTargetNameChanged = async (tls: TLS): Promise<boolean> => {
	if (!tls.file) return false;
	const document = await openDocument(tls.file);
	if (!document) return false;
	const found = findInDocument(document, "{", `ervice ${tls.target}`);
	return found === undefined;
};

/**
 * Gets the valid files of all top level services
 * @param visFile URI to the architecture file
 * @returns list of paths as string
 */
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
