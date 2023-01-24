declare namespace Remove {
	type PortRequest = {
		filename: string;
		portName: string;
		portType: string;
		serviceName: string;
	};

	type EmbedRequest = {
		filename: string;
		serviceName: string;
		embedName: string;
		embedPort: string;
	};
}

declare namespace Rename {
	type ServiceRequest = {
		filename: string;
		oldServiceName: string;
		newServiceName: string;
	};

	type PortRequest = {
		filename: string;
		serviceName: string;
		oldLine: string;
		newLine: string;
		portName: string;
		portType: "inputPort" | "outputPort";
		editType: string;
	};
}

declare namespace Create {
	type PortRequest = {
		serviceName: string;
		file: string;
		portType: string;
		port: {
			name: string;
			location: string;
			protocol: string;
			interfaces: string;
		};
	};
}

type TLS = {
	file: string;
	target?: string;
	params?: string;
	instances: number;
};
