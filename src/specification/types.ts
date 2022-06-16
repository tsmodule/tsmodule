type PackageJsonSettings = {
  [key: string]: string | number | boolean | object;
};

export type TsmoduleProjectType = "default" | "react";

export interface TsModuleProjectConfig {
  files: string[];
  packageJson: PackageJsonSettings;
  dependencies: string[];
  devDependencies: string[];
}

export type TsmoduleSpecification = {
  [key in TsmoduleProjectType]: TsModuleProjectConfig;
};