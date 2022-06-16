export type ProjectType = "default" | "react";

export type PackageJsonSettings = {
  [key: string]: string | number | boolean | object;
};

export interface ProjectConfiguration {
  files: string[];
  packageJson: PackageJsonSettings;
  dependencies: string[];
  devDependencies: string[];
}

export type TsmoduleSpecification = {
  [key in ProjectType]: ProjectConfiguration;
};