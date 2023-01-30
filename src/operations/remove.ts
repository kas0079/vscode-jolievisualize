import * as vscode from "vscode";
import { getRangeWithPrefixToken, openDocument } from "../utils";

//Done
export const removeEmbed = async (req: Remove.EmbedRequest) => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const res = await remove(
		document,
		getRangeWithPrefixToken(document, req.range, "embed")
	);
	if (res) await document.save();
	return res;
};

//done
export const removePort = async (req: Remove.PortRequest) => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const res = await remove(
		document,
		getRangeWithPrefixToken(document, req.range, req.portType)
	);
	if (res) await document.save();
	return res;
};

//done
const remove = async (document: vscode.TextDocument, range: vscode.Range) => {
	const edit = new vscode.WorkspaceEdit();
	edit.delete(document.uri, range);
	const res = await vscode.workspace.applyEdit(edit);
	return res;
};
