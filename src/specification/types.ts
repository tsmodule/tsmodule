import { PackageJsonSettings } from "../utils/packageJson";


export type TsmoduleProjectType = "default" | "react";

export interface TsModuleProjectConfig {
  files: string[];
  dependencies: string[];
  devDependencies: string[];
  packageJson: PackageJsonSettings;
}

export type TsmoduleSpecification = {
  [key in TsmoduleProjectType]: TsModuleProjectConfig;
};