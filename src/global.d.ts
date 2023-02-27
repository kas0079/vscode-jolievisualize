import { TextDocument, WorkspaceEdit } from "vscode";

declare namespace Deployment {
	type BuildInfo = {
		deployment: string;
		folders: Folder[];
	};

	type Folder = {
		name: string;
		target: string;
		main: string;
		expose?: number[];
		args?: string;
		files: string[];
		params?: string;
		volumes?: string[];
	};
}

declare namespace Remove {
	type PortRequest = {
		filename: string;
		portType: string;
		range: SimpleRange;
	};

	type EmbedRequest = {
		filename: string;
		range: SimpleRange;
	};
}

declare namespace Rename {
	type ServiceRequest = {
		filename: string;
		newServiceName: string;
		range: SimpleRange;
	};

	type PortRequest = {
		filename: string;
		newLine: string;
		editType: string;
		range: SimpleRange;
	};
}

declare namespace Create {
	type EmbedRequest = {
		filename: string;
		embedName: string;
		embedPort: string;
		range: SimpleRange;
		isFirst?: boolean;
	};

	type PortRequest = {
		file: string;
		portType: string;
		range: SimpleRange;
		isFirst: boolean;
		port: {
			name: string;
			location: string;
			protocol: string;
			interfaces: string;
		};
	};
}

type UIEdit = {
	edit: WorkspaceEdit;
	document: TextDocument;
	offset: number;
};

type SimpleRange = {
	start: { line: number; char: number };
	end: { line: number; char: number };
};

type TLS = {
	file?: string;
	name?: string;
	target?: string;
	params?: string | object;
	instances?: number;
	volumes?: string[];
	args?: string;
	image?: string;
	env?: object;
};
