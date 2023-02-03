import * as vscode from "vscode";
import { getRangeWithPrefixToken, openDocument } from "../utils";
import { Remove, UIEdit } from "../global";

//Done
export const removeEmbed = async (
	req: Remove.EmbedRequest
): Promise<false | UIEdit> => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const range = getRangeWithPrefixToken(document, req.range, "embed");
	const edit = await remove(document, range);
	return { edit, document, offset: document.offsetAt(range.start) };
};

//done
export const removePort = async (
	req: Remove.PortRequest
): Promise<false | UIEdit> => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const range = getRangeWithPrefixToken(document, req.range, req.portType);

	const edit = await remove(document, range);
	return { edit, document, offset: document.offsetAt(range.start) };
};

//done
const remove = async (
	document: vscode.TextDocument,
	range: vscode.Range
): Promise<vscode.WorkspaceEdit> => {
	const edit = new vscode.WorkspaceEdit();
	edit.delete(document.uri, range);
	return edit;
};
