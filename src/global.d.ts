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

type SimpleRange = {
	start: { line: number; char: number };
	end: { line: number; char: number };
};

type TLS = {
	file: string;
	target?: string;
	params?: string;
	instances: number;
};
