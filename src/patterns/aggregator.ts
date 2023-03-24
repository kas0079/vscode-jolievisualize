import { Pattern, SimpleRange, UIEdit } from "../global";
import { createPort, createService } from "../operations/create";
import { openDocument } from "../utils";

/**
 * Handles a create aggregator request from the UI.
 * Creates all necessary ports in code, as well as the aggregator service.
 * @returns false if creation failed, UIEdit if success.
 */
export const createAggregator = async (
	req: Pattern.AggregatorRequest
): Promise<false | UIEdit[]> => {
	const edits: UIEdit[] = [];

	for (let i = 0; i < req.newIps.length; i++) {
		const ip = req.newIps[i];
		ip.location = ip.location.startsWith("!local") ? "local" : ip.location;
		const p = await createPort({
			file: ip.file,
			isFirst: ip.isFirst,
			port: ip,
			portType: "inputPort",
			range: ip.range,
		});
		if (!p) continue;
		edits.push(p);
	}

	const document = await openDocument(req.service.file);
	if (!document) return false;

	const pos = document.positionAt(document.getText().length);
	const range: SimpleRange = {
		start: { line: pos.line, char: pos.character },
		end: { line: pos.line, char: pos.character },
	};

	const ops = req.service.outputPorts.map((t) => {
		return {
			interfaces: t.interfaces?.flatMap((t) => t.name).toString(),
			name: t.name,
			location: t.location.startsWith("!local") ? "local" : t.location,
			protocol: t.protocol,
		};
	});

	const svc = await createService({
		file: req.service.file,
		name: req.service.name,
		execution: req.service.execution,
		inputPorts: req.service.inputPorts,
		outputPorts: ops,
		embeddings: req.embeddings,
		range,
	});

	if (!svc) return false;
	edits.push(svc);
	return edits;
};
