import * as vscode from "vscode";
import {
	convertToVsCodeRange,
	getRangeWithSuffixToken,
	openDocument,
} from "../utils";
import { Create, UIEdit } from "../global";

export const createService = async (
	req: Create.ServiceRequest
): Promise<false | UIEdit> => {
	const document = await openDocument(req.file);
	if (!document) return false;

	let ops = "";
	let ips = "";
	let embs = "";

	if (req.outputPorts)
		req.outputPorts.forEach((op) => {
			ops += `outputPort ${op.name} {
		Protocol: ${op.protocol}
		Location: "${op.location}"
		${op.interfaces ? `Interfaces: ${op.interfaces}` : ``}
	}\n\n\t`;
		});

	if (req.inputPorts)
		req.inputPorts.forEach((ip) => {
			ips += `${
				ip.annotation ? `\t///@jolievisualize ${ip.annotation}\n` : ""
			}\tinputPort ${ip.name} {
		Protocol: ${ip.protocol}
		Location: "${ip.location}"
		${ip.interfaces ? `Interfaces: ${ip.interfaces}` : ``}
		${
			ip.aggregates && ip.aggregates.length > 0
				? `Aggregates: ${ip.aggregates.map((t) => t.name)}`
				: ``
		}
	}\n\n\t`;
		});

	if (req.embeddings)
		req.embeddings.forEach(
			(emb) => (embs += `embed ${emb.name} in ${emb.port}\n\t`)
		);

	const code = `\n\nservice ${req.name} {
	${req.execution ? `execution{${req.execution}}\n` : ""}
	${req.outputPorts ? `${ops}\n` : ""}${req.inputPorts ? `${ips}` : ""}${
		req.embeddings ? `${embs}\n` : ""
	}
}`;

	const range = convertToVsCodeRange(document.getText(), req.range);

	const edit = await create(document, range.end, code);
	return { edit, document, offset: document.offsetAt(range.end) };
};

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

	const code = `${req.isFirst ? "\n" : ""}\n${
		req.port.annotation
			? `\t\\\\\\@jolievisualize ${req.port.annotation}`
			: ""
	}\t${req.portType} ${req.port.name} {
		Location: "${req.port.location}"
		Protocol: ${req.port.protocol}
		${
			req.port.interfaces === ""
				? "OneWay: dummy(void)"
				: "Interfaces: " + req.port.interfaces
		}
	}${req.isFirst ? "" : "\n\n\t"}`;

	const range = req.isFirst
		? getRangeWithSuffixToken(document, req.range, "{")
		: convertToVsCodeRange(document.getText(), req.range);

	const edit = req.isFirst
		? await create(document, range.end, code)
		: await create(document, range.end.translate(0, 1), code);

	console.log(
		req.isFirst,
		document.offsetAt(range.end),
		document.positionAt(document.offsetAt(range.end)),
		range,
		req.range
	);

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
