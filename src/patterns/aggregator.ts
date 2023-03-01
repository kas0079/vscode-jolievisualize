import { Pattern, SimpleRange, UIEdit } from "../global";
import { createPort, createService } from "../operations/create";
import { openDocument } from "../utils";

export const createAggregator = async (
	req: Pattern.AggregatorRequest
): Promise<false | UIEdit[]> => {
	const edits: UIEdit[] = [];
	req.newIps.forEach(async (ip) => {
		const p = await createPort({
			file: ip.file,
			isFirst: ip.isFirst,
			port: ip,
			portType: "inputPort",
			range: ip.range,
		});
		if (!p) return;
		edits.push(p);
	});

	const document = await openDocument(req.service.file);
	if (!document) return false;

	const pos = document.positionAt(document.getText().length - 1);
	const range: SimpleRange = {
		start: { line: pos.line, char: pos.character },
		end: { line: pos.line, char: pos.character },
	};

	const svc = await createService({
		file: req.service.file,
		name: req.service.name,
		execution: req.service.execution,
		inputPorts: req.service.inputPorts,
		outputPorts: req.service.outputPorts,
		range,
	});

	if (!svc) return false;
	edits.push(svc);
	return edits;
};
