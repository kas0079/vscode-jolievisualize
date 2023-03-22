import * as vscode from "vscode";
import { Remove, UIEdit } from "../global";
import {
	getRangeWithPrefixToken,
	isPortRangeAnEmbedding,
	openDocument,
} from "../utils";

//Done
export const removeEmbed = async (
	req: Remove.EmbedRequest
): Promise<false | UIEdit> => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const range = getRangeWithPrefixToken(document, req.range, "embed");
	if (range === -1) return false;

	const edit = await remove(document, range);
	return { edit, document, offset: document.offsetAt(range.start) };
};

//done
export const removePort = async (
	req: Remove.PortRequest
): Promise<false | UIEdit> => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const range = isPortRangeAnEmbedding(document, req.range)
		? getRangeWithPrefixToken(document, req.range, "embed")
		: getRangeWithPrefixToken(document, req.range, req.portType);

	if (range === -1) {
		return false;
	}
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
