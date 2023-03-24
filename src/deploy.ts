import * as fs from "fs";
import * as path from "path";
import { Deployment } from "./global";

/**
 * Formats the build folder name so the Java tool gets consistent input.
 * @param folder build folder name
 * @returns formatted build folder name
 */
export const formatBuildFolder = (folder: string): string => {
	let res = "";
	if (!folder.startsWith("/")) res = "/" + folder;
	if (folder.endsWith("/")) res.substring(0, res.length - 1);
	return res;
};

/**
 * Checks which build method should be used. Then generates the correct .yaml file content and
 * creates the folders, copies dependencies and makes Dockerfiles.
 * @param data data from the java tool
 * @param visFile object which contains a path to a file. This should be the visualization json file
 * @param buildFolder The foldername of the build
 * @param deployMethod "docker-compose" or "kubernetes"
 */
export const build = (p: {
	data: string;
	visFile: string;
	buildFolder: string;
	deployMethod: string;
}): void => {
	const visFile = p.visFile;
	const buildRoot = path.join(path.dirname(visFile), p.buildFolder);
	const deployMethod = p.deployMethod;

	if (fs.existsSync(buildRoot)) fs.rmSync(buildRoot, { recursive: true });

	fs.mkdirSync(buildRoot, { recursive: true });

	let build;

	switch (deployMethod) {
		case "docker-compose":
			build = dockerComposeBuild(p.data, buildRoot);
			break;
		case "kubernetes":
			//! not implemented
			break;
	}

	if (!build) return;

	build.folders.forEach((folder) => {
		fs.mkdirSync(path.join(buildRoot, folder.name), { recursive: true });
		let jpm = false;
		if (
			fs.existsSync(
				path.join(
					path.dirname(visFile),
					path.dirname(folder.main),
					"package.json"
				)
			)
		) {
			fs.cpSync(
				path.join(
					path.dirname(visFile),
					path.dirname(folder.main),
					"package.json"
				),
				path.join(buildRoot, folder.name, "package.json"),
				{ recursive: true }
			);
			jpm = true;
		}

		const mainPath = path.join(path.dirname(visFile), folder.main);
		fs.cpSync(mainPath, path.join(buildRoot, folder.name, folder.main), {
			recursive: true,
		});

		folder.files.forEach((file) => {
			const oLPath = path.join(path.dirname(visFile), file);
			fs.cpSync(oLPath, path.join(buildRoot, folder.name, file), {
				recursive: true,
			});
		});

		folder.volumes?.forEach((vol) => {
			fs.cpSync(
				path.join(path.join(path.dirname(visFile)), vol),
				path.join(buildRoot, "-res", vol),
				{ recursive: true }
			);
		});

		const dockerFileContent = makeDockerfile(folder, jpm);
		fs.writeFileSync(
			path.join(buildRoot, folder.name, "Dockerfile"),
			dockerFileContent
		);
	});
};

/**
 * Calls the method from index which runs the Java tool and generates the information about the build.
 * @param visFile object which contains a path to a file. This should be the visualization json file.
 * @param buildRoot build dir folder name.
 * @returns BuildInfo which contains information about the folders in the build dir, and the yaml content
 */
const dockerComposeBuild = (
	dockercomposeData: string,
	buildRoot: string
): Deployment.BuildInfo => {
	const build = JSON.parse(dockercomposeData) as Deployment.BuildInfo;
	fs.writeFileSync(
		path.join(buildRoot, "docker-compose.yml"),
		build.deployment
	);

	return build;
};

/**
 * Makes the Dockerfile content
 * @param folder information about the folder which the Dockerfile should generate an image of
 * @param jpm is the project is using JPM
 * @returns Dockerfile content as string
 */
const makeDockerfile = (folder: Deployment.Folder, jpm: boolean): string => {
	return `FROM jolielang/jolie\n${
		folder.expose
			? "EXPOSE " + folder.expose.map((t) => t + " ") + "\n"
			: ""
	}COPY . .\n${jpm ? "RUN jpm install\n" : ""}CMD jolie --service ${
		folder.target
	}${folder.params ? " --params " + folder.params : ""}${
		folder.args ? " " + folder.args : ""
	} ${folder.main}`;
};
