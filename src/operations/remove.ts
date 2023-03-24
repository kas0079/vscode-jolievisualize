import * as vscode from "vscode";
import { Remove, UIEdit } from "../global";
import {
	getRangeWithPrefixToken,
	isPortRangeAnEmbedding,
	openDocument,
} from "../utils";

/**
 * Removes an embed line of code from a file.
 * @returns false if removal failed, UIEdit if success.
 */
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

/**
 * Removes a port definition from a file.
 * @returns false if creation failed, UIEdit if success.
 */
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

/**
 * Helper function to remove code given a range in a document.
 * @param document document to remove the code from
 * @param range range of the code to remove
 * @returns vscode workspace edit
 */
const remove = async (
	document: vscode.TextDocument,
	range: vscode.Range
): Promise<vscode.WorkspaceEdit> => {
	const edit = new vscode.WorkspaceEdit();
	edit.delete(document.uri, range);
	return edit;
};
