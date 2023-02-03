import * as vscode from "vscode";
import {
	convertToVsCodeRange,
	getRangeWithPrefixToken,
	getRangeWithSuffixToken,
	openDocument,
} from "../utils";
import { Create, UIEdit } from "../global";

export const createAggregator = async () => {};

//done
export const createEmbed = async (
	req: Create.EmbedRequest
): Promise<false | UIEdit> => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const code = `\n\n\tembed ${req.embedName} in ${req.embedPort}`;

	const range = req.isFirst
		? getRangeWithSuffixToken(document, req.range, "{")
		: convertToVsCodeRange(document.getText(), req.range);

	const edit = await create(document, range.end, code);
	return { edit, document, offset: document.offsetAt(range.start) };
};

//done
export const createPort = async (
	req: Create.PortRequest
): Promise<false | UIEdit> => {
	const document = await openDocument(req.file);
	if (!document) return false;

	const code = `${req.isFirst ? "\n" : ""}\n\t${req.portType} ${
		req.port.name
	} {
		Location: "${req.port.location}"
		Protocol: ${req.port.protocol}
		Interfaces: ${req.port.interfaces}
	}${req.isFirst ? "" : "\n\n\t"}`;

	const range = req.isFirst
		? getRangeWithSuffixToken(document, req.range, "{")
		: getRangeWithPrefixToken(document, req.range, req.portType);

	const edit = req.isFirst
		? await create(document, range.end, code)
		: await create(document, range.start, code);
	return { edit, document, offset: document.offsetAt(range.start) };
};

//done
const create = async (
	document: vscode.TextDocument,
	position: vscode.Position,
	code: string
): Promise<vscode.WorkspaceEdit> => {
	const edit = new vscode.WorkspaceEdit();
	edit.insert(document.uri, position, code);
	return edit;
};
