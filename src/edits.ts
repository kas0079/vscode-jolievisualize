import * as vscode from "vscode";
import * as jv from "jolievisualize";
import { getVisFileURI, setIntercept } from "./extension";
import WebPanel from "./WebPanel";
import { UIEdit } from "./global";

const edits: UIEdit[] = [];

/**
 * Adds an edit to the stack of pending edits
 * @param edit Edit to add
 */
export const addEdit = (edit: UIEdit | false): void => {
	if (!edit || isEditAlreadyOnStack(edit)) return;
	edits.push(edit);
};

/**
 * Applies all edits by sorting them by offset in the textfile, so the edit happening the
 * latest in the file gets applied first to keep the ranges intact.
 */
export const applyEditsAndSave = async (): Promise<void> => {
	edits.sort((a, b) => b.offset - a.offset);
	for (let i = 0; i < edits.length; i++)
		await vscode.workspace.applyEdit(edits[i].edit);

	setIntercept(true);
	for (let i = 0; i < edits.length; i++) await edits[i].document.save();

	while (edits.length > 0) edits.pop();

	const data = await jv.getData(getVisFileURI(), false);
	if (JSON.parse(data).error) {
		WebPanel.data = data;
		WebPanel.initData();
	} else WebPanel.sendRange(await jv.getData(getVisFileURI(), false));
};

/**
 * @param edit edit to check if it already exists on stack
 * @returns true if edit exists
 */
const isEditAlreadyOnStack = (edit: UIEdit): boolean => {
	let res = false;
	for (const e of edits) {
		if (
			e.document.uri.fsPath !== edit.document.uri.fsPath ||
			!e.document.uri.fsPath.endsWith(".ol") ||
			!edit.document.uri.fsPath.endsWith(".ol")
		)
			continue;
		const textEdits = e.edit.get(edit.document.uri);
		const textEdits2 = edit.edit.get(edit.document.uri);
		if (textEdits.length !== textEdits2.length) continue;
		for (let i = 0; i < textEdits.length; i++) {
			const te1 = textEdits[i];
			const te2 = textEdits2[i];
			if (te1.newText === te2.newText && te1.range.isEqual(te2.range)) {
				res = true;
				break;
			}
		}
	}
	return res;
};
