import * as vscode from "vscode";
import { convertToVsCodeRange, openDocument } from "../utils";
import { Rename, UIEdit } from "../global";

export const renameService = async (
	req: Rename.ServiceRequest
): Promise<false | UIEdit> => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const range = convertToVsCodeRange(document.getText(), req.range);

	const edit = await renameToken(document, range.start, req.newServiceName);
	return { edit, document, offset: document.offsetAt(range.start) };
};

// TODO: test
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

const replaceLine = async (
	document: vscode.TextDocument,
	range: vscode.Range,
	newText: string
) => {
	const edit = new vscode.WorkspaceEdit();
	edit.replace(document.uri, range, newText);
	return edit;
};

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
