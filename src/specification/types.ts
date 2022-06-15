export type ProjectType = "default" | "react";

export interface ProjectConfiguration {
  dependencies: string[];
  devDependencies: string[];
}

export type TsmoduleSpecification = {
  [key in ProjectType]: ProjectConfiguration;
};