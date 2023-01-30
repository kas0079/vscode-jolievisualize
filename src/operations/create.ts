import * as vscode from "vscode";
import {
	convertToVsCodeRange,
	getRangeWithPrefixToken,
	getRangeWithSuffixToken,
	openDocument,
} from "../utils";

export const createAggregator = async () => {};

//done
export const createEmbed = async (req: Create.EmbedRequest) => {
	const document = await openDocument(req.filename);
	if (!document) return false;

	const code = `\n\tembed ${req.embedName} in ${req.embedPort}\n`;

	const res = await create(
		document,
		convertToVsCodeRange(document.getText(), req.range).end,
		code
	);

	if (res) document.save();
	return res;
};

//done
export const createPort = async (req: Create.PortRequest) => {
	const document = await openDocument(req.file);
	if (!document) return false;

	const code = `${req.isFirst ? "\n" : ""}\n\t${req.portType} ${
		req.port.name
	} {
		Location: "${req.port.location}"
		Protocol: ${req.port.protocol}
		Interfaces: ${req.port.interfaces}
	}${req.isFirst ? "" : "\n\n\t"}`;

	const res = req.isFirst
		? await create(
				document,
				getRangeWithSuffixToken(document, req.range, "{").end,
				code
		  )
		: await create(
				document,
				getRangeWithPrefixToken(document, req.range, req.portType)
					.start,
				code
		  );

	if (res) document.save();
	return res;
};

//done
const create = async (
	document: vscode.TextDocument,
	position: vscode.Position,
	code: string
) => {
	const edit = new vscode.WorkspaceEdit();
	edit.insert(document.uri, position, code);
	const result = await vscode.workspace.applyEdit(edit);
	return result;
};
