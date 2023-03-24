import * as vscode from "vscode";
import { convertToVsCodeRange, openDocument } from "../utils";
import { Rename, UIEdit } from "../global";

/**
 * Replaces the name of a service in the file
 * @returns false if creation failed, UIEdit if success.
 */
export const renameService = async (
	req: Rename.ServiceRequest
): Promise<false | UIEdit> => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const range = convertToVsCodeRange(document.getText(), req.range);

	const edit = await renameToken(document, range.start, req.newServiceName);
	return { edit, document, offset: document.offsetAt(range.start) };
};

/**
 * replaces either the name or some property of a port in a file
 * @returns false if creation failed, UIEdit if success.
 */
export const renamePort = async (
	req: Rename.PortRequest
): Promise<false | UIEdit> => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const range = convertToVsCodeRange(document.getText(), req.range);

	const edit =
		req.editType === "port_name"
			? await renameToken(document, range.start, req.newLine)
			: await replaceLine(document, range, req.newLine);
	return { edit, document, offset: document.offsetAt(range.start) };
};

/**
 * Helper function to replace some code in a document given the range
 * @param document document of the code to replace
 * @param range range of the code to replace
 * @param newText the new text
 * @returns vscode WorkspaceEdit
 */
const replaceLine = async (
	document: vscode.TextDocument,
	range: vscode.Range,
	newText: string
): Promise<vscode.WorkspaceEdit> => {
	const edit = new vscode.WorkspaceEdit();
	edit.replace(document.uri, range, newText);
	return edit;
};

/**
 * Helper function which calls the LSP and renames all occurances of the token
 * @param document Document of the token to rename
 * @param pos position of the token to rename
 * @param newName new name of the token
 * @returns vscode WorkspaceEdit
 */
const renameToken = async (
	document: vscode.TextDocument,
	pos: vscode.Position,
	newName: string
): Promise<vscode.WorkspaceEdit> => {
	const c = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
		"vscode.executeDocumentRenameProvider",
		document.uri,
		pos,
		newName
	);
	return c;
};
